import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { Prisma, StockMovementType } from '@prisma/client';
import { isISODate } from '../utils/date';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const movementSelectWithCreator = {
  id: true,
  date: true,
  type: true,
  quantity: true,
  note: true,
  productId: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  product: {
    select: {
      id: true,
      name: true,
      type: true,
      unit: { select: { name: true, short: true } },
    },
  },
} satisfies Prisma.StockMovementSelect;

const movementSelectWithoutCreator = {
  id: true,
  date: true,
  type: true,
  quantity: true,
  note: true,
  productId: true,
  createdAt: true,
  updatedAt: true,
  product: {
    select: {
      id: true,
      name: true,
      type: true,
      unit: { select: { name: true, short: true } },
    },
  },
} satisfies Prisma.StockMovementSelect;

function isMissingCreatedByColumn(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== 'P2022') return false;

  const column = String((error.meta as { column?: string } | undefined)?.column ?? '');
  return (
    column.includes('StockMovement.createdById') ||
    error.message.includes('StockMovement.createdById')
  );
}

function isCreatedByRelationIssue(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== 'P2003') return false;

  const field = String(
    (error.meta as { field_name?: string } | undefined)?.field_name ?? '',
  );
  return field.includes('createdById') || error.message.includes('createdById');
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
    const take = limit && limit > 0 ? Math.min(limit, 50) : 20;
    return this.listWithCreatorFallback(take);
  }

  async createMovement(dto: CreateStockMovementDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const date = dto.date ?? todayISO();
    if (!isISODate(date)) throw new BadRequestException('Invalid date');
    const note = dto.note?.trim() || null;
    const createdById = dto.createdById?.trim() || undefined;
    return this.prisma.$transaction(async (tx) => {
      const movement = await this.createWithCreatorFallback(tx, {
        productId: dto.productId,
        date,
        type: dto.type,
        quantity: dto.quantity,
        note,
        createdById,
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

  private async listWithCreatorFallback(take: number) {
    try {
      return await this.prisma.stockMovement.findMany({
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take,
        select: movementSelectWithCreator,
      });
    } catch (error) {
      if (!isMissingCreatedByColumn(error)) throw error;

      return this.prisma.stockMovement.findMany({
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take,
        select: movementSelectWithoutCreator,
      });
    }
  }

  private async createWithCreatorFallback(
    tx: Prisma.TransactionClient,
    data: {
      productId: string;
      date: string;
      type: StockMovementType;
      quantity: number;
      note: string | null;
      createdById?: string;
    },
  ) {
    const baseData: Prisma.StockMovementUncheckedCreateInput = {
      productId: data.productId,
      date: data.date,
      type: data.type,
      quantity: data.quantity,
      note: data.note,
    };

    try {
      return await tx.stockMovement.create({
        data: data.createdById
          ? { ...baseData, createdById: data.createdById }
          : baseData,
      });
    } catch (error) {
      if (
        !data.createdById ||
        (!isMissingCreatedByColumn(error) && !isCreatedByRelationIssue(error))
      ) {
        throw error;
      }

      return tx.stockMovement.create({ data: baseData });
    }
  }
}
