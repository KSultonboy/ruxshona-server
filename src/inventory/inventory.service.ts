import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryCheckDto } from './dto/create-inventory.dto';
import { StockMovementType, InventoryCheckStatus } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateInventoryCheckDto) {
    const { items, ...data } = dto;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create the inventory check record
      const check = await tx.inventoryCheck.create({
        data: {
          ...data,
          createdById: userId,
          status: 'PENDING' as InventoryCheckStatus,
        },
      });

      // 2. Prepare items with system quantities
      const itemsWithSystem = await Promise.all(
        items.map(async (item) => {
          let systemQuantity = 0;
          if (dto.branchId) {
            const stock = await tx.branchStock.findUnique({
              where: {
                branchId_productId: {
                  branchId: dto.branchId,
                  productId: item.productId,
                },
              },
            });
            systemQuantity = stock?.quantity || 0;
          } else {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
            });
            systemQuantity = product?.stock || 0;
          }

          return {
            inventoryCheckId: check.id,
            productId: item.productId,
            systemQuantity,
            actualQuantity: item.actualQuantity,
          };
        }),
      );

      // 3. Create items
      await tx.inventoryCheckItem.createMany({
        data: itemsWithSystem,
      });

      return check;
    });
  }

  async findAll() {
    return this.prisma.inventoryCheck.findMany({
      include: {
        createdBy: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const check = await this.prisma.inventoryCheck.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true } },
        branch: { select: { name: true } },
        items: {
          include: {
            product: {
              select: {
                name: true,
                barcode: true,
                unit: { select: { short: true } },
              },
            },
          },
        },
      },
    });

    if (!check) throw new NotFoundException('Inventory check not found');
    return check;
  }

  async finalize(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const check = await tx.inventoryCheck.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!check) throw new NotFoundException('Inventory check not found');
      if (check.status !== 'PENDING')
        throw new Error('Inventory check already finalized or canceled');

      // For each item, create a stock movement if there's a discrepancy
      for (const item of check.items) {
        const diff = item.actualQuantity - item.systemQuantity;
        if (diff === 0) continue;

        const type: StockMovementType = diff > 0 ? 'IN' : 'OUT';
        const absQty = Math.abs(diff);

        if (check.branchId) {
          // Adjust Branch Stock
          await tx.branchStock.upsert({
            where: {
              branchId_productId: {
                branchId: check.branchId,
                productId: item.productId,
              },
            },
            update: { quantity: { increment: diff } },
            create: {
              branchId: check.branchId,
              productId: item.productId,
              quantity: item.actualQuantity,
            },
          });
        } else {
          // Adjust Central Stock
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: diff } },
          });

          // Create StockMovement record for central warehouse
          await tx.stockMovement.create({
            data: {
              date: check.date,
              type,
              quantity: absQty,
              productId: item.productId,
              note: `Inventory adjustment (Check ID: ${check.id})`,
            },
          });
        }
      }

      return tx.inventoryCheck.update({
        where: { id },
        data: { status: 'COMPLETED' as InventoryCheckStatus },
      });
    });
  }

  async remove(id: string) {
    const check = await this.prisma.inventoryCheck.findUnique({
      where: { id },
    });
    if (!check) throw new NotFoundException('Inventory check not found');
    if (check.status === 'COMPLETED')
      throw new Error('Cannot delete completed inventory check');

    return this.prisma.inventoryCheck.delete({ where: { id } });
  }
}
