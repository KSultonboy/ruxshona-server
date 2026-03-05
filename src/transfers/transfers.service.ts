import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import {
  ShiftStatus,
  TransferStatus,
  TransferTargetType,
  UserRole,
} from '@prisma/client';
import { isISODate } from '../utils/date';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type AuthUser = { id: string; role: UserRole };

type TransferItemInput = { productId: string; quantity: number };

function normalizeItems(items: TransferItemInput[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    const productId = item.productId?.trim();
    const quantity = Number(item.quantity);
    if (!productId) throw new BadRequestException('Product required');
    if (!Number.isFinite(quantity) || quantity <= 0)
      throw new BadRequestException('Invalid quantity');
    map.set(productId, (map.get(productId) ?? 0) + quantity);
  }
  return Array.from(map, ([productId, quantity]) => ({ productId, quantity }));
}

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  private async ensureSalesShiftOpen(user: AuthUser) {
    if (user.role !== 'SALES') return;
    const shift = await this.prisma.shift.findFirst({
      where: { openedById: user.id, status: ShiftStatus.OPEN },
    });
    if (!shift) throw new ForbiddenException('Shift is closed');
  }

  async list(user: AuthUser) {
    await this.ensureSalesShiftOpen(user);
    if (user.role === 'SALES') {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.id },
      });
      if (!dbUser?.branchId) return [];
      return this.prisma.transfer.findMany({
        where: { branchId: dbUser.branchId },
        orderBy: [{ createdAt: 'desc' }],
        include: {
          items: { include: { product: true } },
          branch: true,
          shop: true,
        },
      });
    }

    return this.prisma.transfer.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        items: { include: { product: true } },
        branch: true,
        shop: true,
      },
    });
  }

  async create(dto: CreateTransferDto, user: AuthUser) {
    if (user.role === 'SALES') {
      throw new ForbiddenException(
        'Only admin or production can create transfers',
      );
    }
    if (!dto.items?.length) {
      throw new BadRequestException('Items required');
    }

    const items = normalizeItems(dto.items);

    if (dto.targetType === TransferTargetType.BRANCH) {
      if (!dto.branchId) throw new BadRequestException('Branch required');
      if (dto.shopId)
        throw new BadRequestException('Shop not allowed for branch transfer');
    }
    if (dto.targetType === TransferTargetType.SHOP) {
      if (!dto.shopId) throw new BadRequestException('Shop required');
      if (dto.branchId)
        throw new BadRequestException('Branch not allowed for shop transfer');
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
      });
      if (!branch) throw new BadRequestException('Branch not found');
    }
    if (dto.shopId) {
      const shop = await this.prisma.shop.findUnique({
        where: { id: dto.shopId },
      });
      if (!shop) throw new BadRequestException('Shop not found');
    }

    const productIds = items.map((i) => i.productId);
    const uniqueProductIds = Array.from(new Set(productIds));
    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueProductIds } },
    });
    if (products.length !== uniqueProductIds.length) {
      throw new NotFoundException('Product not found');
    }

    const stockMap = new Map(products.map((p) => [p.id, p.stock]));
    for (const item of items) {
      const stock = stockMap.get(item.productId) ?? 0;
      if (stock < item.quantity) {
        throw new BadRequestException('Insufficient stock');
      }
    }

    const date = dto.date ?? todayISO();
    if (!isISODate(date)) throw new BadRequestException('Invalid date');
    const note = dto.note?.trim() || null;
    const autoReceive = dto.targetType === TransferTargetType.SHOP;

    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.create({
        data: {
          date,
          status: autoReceive
            ? TransferStatus.RECEIVED
            : TransferStatus.PENDING,
          targetType: dto.targetType,
          note,
          branchId: dto.branchId ?? null,
          shopId: dto.shopId ?? null,
          createdById: user.id,
          receivedById: autoReceive ? user.id : null,
        },
      });

      await tx.transferItem.createMany({
        data: items.map((item) => ({
          transferId: transfer.id,
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      for (const item of items) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count !== 1) {
          throw new BadRequestException('Insufficient stock');
        }
      }

      return transfer;
    });
  }

  async update(id: string, dto: UpdateTransferDto, user: AuthUser) {
    if (user.role === 'SALES') {
      throw new ForbiddenException(
        'Only admin or production can update transfers',
      );
    }

    const exists = await this.prisma.transfer.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!exists) throw new NotFoundException('Transfer not found');
    const canEditBranchPending =
      exists.targetType === TransferTargetType.BRANCH &&
      exists.status === TransferStatus.PENDING;
    const canEditShopReceived =
      exists.targetType === TransferTargetType.SHOP &&
      exists.status === TransferStatus.RECEIVED;
    if (!canEditBranchPending && !canEditShopReceived) {
      throw new BadRequestException(
        'Only pending branch or received shop transfers can be edited',
      );
    }

    if (dto.targetType && dto.targetType !== exists.targetType) {
      throw new BadRequestException('Changing transfer type is not allowed');
    }

    const nextTargetType = exists.targetType;
    let nextBranchId =
      nextTargetType === TransferTargetType.BRANCH
        ? (dto.branchId ?? exists.branchId ?? undefined)
        : undefined;
    let nextShopId =
      nextTargetType === TransferTargetType.SHOP
        ? (dto.shopId ?? exists.shopId ?? undefined)
        : undefined;

    if (nextTargetType === TransferTargetType.BRANCH) {
      if (!nextBranchId) throw new BadRequestException('Branch required');
      nextShopId = undefined;
    }
    if (nextTargetType === TransferTargetType.SHOP) {
      if (!nextShopId) throw new BadRequestException('Shop required');
      nextBranchId = undefined;
    }

    if (nextBranchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: nextBranchId },
      });
      if (!branch) throw new BadRequestException('Branch not found');
    }
    if (nextShopId) {
      const shop = await this.prisma.shop.findUnique({
        where: { id: nextShopId },
      });
      if (!shop) throw new BadRequestException('Shop not found');
    }

    const nextItems = dto.items
      ? normalizeItems(dto.items)
      : normalizeItems(exists.items);
    if (!nextItems.length) throw new BadRequestException('Items required');

    const productIds = Array.from(
      new Set(nextItems.map((item) => item.productId)),
    );
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('Product not found');
    }

    const nextDate = dto.date ?? exists.date;
    if (!isISODate(nextDate)) throw new BadRequestException('Invalid date');
    const nextNote =
      dto.note !== undefined ? dto.note?.trim() || null : exists.note;
    const prevItems = normalizeItems(exists.items);

    return this.prisma.$transaction(async (tx) => {
      for (const item of prevItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      for (const item of nextItems) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count !== 1) {
          throw new BadRequestException('Insufficient stock');
        }
      }

      await tx.transferItem.deleteMany({ where: { transferId: exists.id } });
      await tx.transferItem.createMany({
        data: nextItems.map((item) => ({
          transferId: exists.id,
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      return tx.transfer.update({
        where: { id: exists.id },
        data: {
          date: nextDate,
          note: nextNote,
          targetType: nextTargetType,
          branchId: nextBranchId ?? null,
          shopId: nextShopId ?? null,
        },
        include: {
          items: { include: { product: true } },
          branch: true,
          shop: true,
        },
      });
    });
  }

  async remove(id: string, user: AuthUser) {
    if (user.role === 'SALES') {
      throw new ForbiddenException(
        'Only admin or production can delete transfers',
      );
    }

    const exists = await this.prisma.transfer.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!exists) throw new NotFoundException('Transfer not found');
    const canDeleteBranchPending =
      exists.targetType === TransferTargetType.BRANCH &&
      exists.status === TransferStatus.PENDING;
    const canDeleteShopReceived =
      exists.targetType === TransferTargetType.SHOP &&
      exists.status === TransferStatus.RECEIVED;
    if (!canDeleteBranchPending && !canDeleteShopReceived) {
      throw new BadRequestException(
        'Only pending branch or received shop transfers can be deleted',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const prevItems = normalizeItems(exists.items);
      for (const item of prevItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.transfer.delete({ where: { id: exists.id } });
      return { ok: true };
    });
  }

  async receive(id: string, user: AuthUser) {
    await this.ensureSalesShiftOpen(user);
    const transfer = await this.prisma.transfer.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.targetType !== TransferTargetType.BRANCH) {
      throw new BadRequestException('Transfer is not for branch');
    }
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Transfer already processed');
    }
    if (!transfer.branchId) {
      throw new BadRequestException('Branch not set');
    }

    if (user.role === 'SALES') {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.id },
      });
      if (!dbUser?.branchId || dbUser.branchId !== transfer.branchId) {
        throw new ForbiddenException('Forbidden');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const items = normalizeItems(transfer.items);
      for (const item of items) {
        await tx.branchStock.upsert({
          where: {
            branchId_productId: {
              branchId: transfer.branchId as string,
              productId: item.productId,
            },
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            branchId: transfer.branchId as string,
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }

      await tx.transfer.update({
        where: { id: transfer.id },
        data: { status: TransferStatus.RECEIVED, receivedById: user.id },
      });

      return { ok: true };
    });
  }
}
