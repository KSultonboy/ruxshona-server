import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { StockMovementType } from '@prisma/client';
import { isISODate } from '../utils/date';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class WarehouseService {
  constructor(private prisma: PrismaService) {}

  async summary() {
    const [totalProducts, stockSum, products] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.aggregate({ _sum: { stock: true } }),
      this.prisma.product.findMany({ select: { stock: true, minStock: true } }),
    ]);

    const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
    const today = todayISO();
    const todayMovements = await this.prisma.stockMovement.findMany({
      where: { date: today },
      select: { type: true, quantity: true },
    });

    const todayIn = todayMovements
      .filter((m) => m.type === StockMovementType.IN)
      .reduce((sum, m) => sum + m.quantity, 0);
    const todayOut = todayMovements
      .filter((m) => m.type === StockMovementType.OUT)
      .reduce((sum, m) => sum + m.quantity, 0);

    return {
      totalProducts,
      totalStock: stockSum._sum?.stock ?? 0,
      lowStockCount,
      todayIn,
      todayOut,
    };
  }

  list(limit?: number) {
    return this.prisma.stockMovement.findMany({
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: limit && limit > 0 ? Math.min(limit, 50) : 20,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            type: true,
            unit: { select: { name: true, short: true } },
          },
        },
      },
    });
  }

  async createMovement(dto: CreateStockMovementDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const date = dto.date ?? todayISO();
    if (!isISODate(date)) throw new BadRequestException('Invalid date');
    const note = dto.note?.trim() || null;
    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          date,
          type: dto.type,
          quantity: dto.quantity,
          note,
          createdById: dto.createdById ?? null,
        },
      });

      if (dto.type === StockMovementType.OUT) {
        const updated = await tx.product.updateMany({
          where: { id: dto.productId, stock: { gte: dto.quantity } },
          data: { stock: { decrement: dto.quantity } },
        });
        if (updated.count !== 1) {
          throw new BadRequestException('Insufficient stock');
        }
      } else {
        await tx.product.update({
          where: { id: dto.productId },
          data: { stock: { increment: dto.quantity } },
        });
      }

      return movement;
    });
  }
}
