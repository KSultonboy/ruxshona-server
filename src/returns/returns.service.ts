import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReturnDto } from "./dto/create-return.dto";
import { UpdateReturnDto } from "./dto/update-return.dto";
import { ReturnSourceType, ReturnStatus, ShiftStatus, UserRole } from "@prisma/client";
import { isISODate } from "../utils/date";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type AuthUser = { id: string; role: UserRole };

type ReturnItemInput = { productId: string; quantity: number };

function normalizeItems(items: ReturnItemInput[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    const productId = item.productId?.trim();
    const quantity = Number(item.quantity);
    if (!productId) throw new BadRequestException("Product required");
    if (!Number.isFinite(quantity) || quantity <= 0) throw new BadRequestException("Invalid quantity");
    map.set(productId, (map.get(productId) ?? 0) + quantity);
  }
  return Array.from(map, ([productId, quantity]) => ({ productId, quantity }));
}

@Injectable()
export class ReturnsService {
  constructor(private prisma: PrismaService) {}

  private async ensureSalesShiftOpen(user: AuthUser) {
    if (user.role !== "SALES") return;
    const shift = await this.prisma.shift.findFirst({
      where: { openedById: user.id, status: ShiftStatus.OPEN },
    });
    if (!shift) throw new ForbiddenException("Shift is closed");
  }

  async list(user: AuthUser) {
    await this.ensureSalesShiftOpen(user);
    if (user.role === "SALES") {
      const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser?.branchId) return [];
      return this.prisma.return.findMany({
        where: { branchId: dbUser.branchId },
        orderBy: [{ createdAt: "desc" }],
        include: {
          items: { include: { product: true } },
          branch: true,
          shop: true,
        },
      });
    }

    return this.prisma.return.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        items: { include: { product: true } },
        branch: true,
        shop: true,
      },
    });
  }

  async create(dto: CreateReturnDto, user: AuthUser) {
    await this.ensureSalesShiftOpen(user);
    if (!dto.items?.length) {
      throw new BadRequestException("Items required");
    }

    const items = normalizeItems(dto.items);

    if (dto.sourceType === ReturnSourceType.BRANCH) {
      if (!dto.branchId) throw new BadRequestException("Branch required");
      if (dto.shopId) throw new BadRequestException("Shop not allowed for branch return");
    }
    if (dto.sourceType === ReturnSourceType.SHOP) {
      if (!dto.shopId) throw new BadRequestException("Shop required");
      if (dto.branchId) throw new BadRequestException("Branch not allowed for shop return");
    }

    if (user.role === "SALES") {
      if (dto.sourceType !== ReturnSourceType.BRANCH) {
        throw new ForbiddenException("Sales user can only create branch return");
      }
      const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser?.branchId || dbUser.branchId !== dto.branchId) {
        throw new ForbiddenException("Forbidden");
      }
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } });
      if (!branch) throw new BadRequestException("Branch not found");
    }
    if (dto.shopId) {
      const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });
      if (!shop) throw new BadRequestException("Shop not found");
    }

    const productIds = items.map((i) => i.productId);
    const uniqueProductIds = Array.from(new Set(productIds));
    const products = await this.prisma.product.findMany({ where: { id: { in: uniqueProductIds } } });
    if (products.length !== uniqueProductIds.length) {
      throw new NotFoundException("Product not found");
    }

    if (dto.branchId) {
      const stocks = await this.prisma.branchStock.findMany({
        where: { branchId: dto.branchId, productId: { in: productIds } },
      });
      const stockMap = new Map(stocks.map((s) => [s.productId, s.quantity]));
      for (const item of items) {
        const qty = stockMap.get(item.productId) ?? 0;
        if (qty < item.quantity) {
          throw new BadRequestException("Insufficient branch stock");
        }
      }
    }

    const date = dto.date ?? todayISO();
    if (!isISODate(date)) throw new BadRequestException("Invalid date");
    const note = dto.note?.trim() || null;

    return this.prisma.return.create({
      data: {
        date,
        status: ReturnStatus.PENDING,
        sourceType: dto.sourceType,
        note,
        branchId: dto.branchId ?? null,
        shopId: dto.shopId ?? null,
        createdById: user.id,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
    });
  }

  async update(id: string, dto: UpdateReturnDto, user: AuthUser) {
    await this.ensureSalesShiftOpen(user);

    const exists = await this.prisma.return.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!exists) throw new NotFoundException("Return not found");
    if (exists.status !== ReturnStatus.PENDING) {
      throw new BadRequestException("Only pending returns can be edited");
    }

    if (user.role !== "ADMIN" && user.role !== "SALES") {
      throw new ForbiddenException("Forbidden");
    }

    if (user.role === "SALES") {
      if (exists.sourceType !== ReturnSourceType.BRANCH) {
        throw new ForbiddenException("Forbidden");
      }
      const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser?.branchId || dbUser.branchId !== exists.branchId) {
        throw new ForbiddenException("Forbidden");
      }
    }

    const nextSourceType = dto.sourceType ?? exists.sourceType;
    const nextItems = dto.items ? normalizeItems(dto.items) : normalizeItems(exists.items);
    if (!nextItems.length) throw new BadRequestException("Items required");

    if (user.role === "SALES" && nextSourceType !== ReturnSourceType.BRANCH) {
      throw new ForbiddenException("Sales user can only edit branch return");
    }

    let nextBranchId = dto.branchId ?? exists.branchId ?? undefined;
    let nextShopId = dto.shopId ?? exists.shopId ?? undefined;

    if (nextSourceType === ReturnSourceType.BRANCH) {
      if (!nextBranchId) throw new BadRequestException("Branch required");
      nextShopId = undefined;
    }
    if (nextSourceType === ReturnSourceType.SHOP) {
      if (!nextShopId) throw new BadRequestException("Shop required");
      nextBranchId = undefined;
      if (user.role === "SALES") throw new ForbiddenException("Forbidden");
    }

    if (nextBranchId) {
      const branch = await this.prisma.branch.findUnique({ where: { id: nextBranchId } });
      if (!branch) throw new BadRequestException("Branch not found");
    }
    if (nextShopId) {
      const shop = await this.prisma.shop.findUnique({ where: { id: nextShopId } });
      if (!shop) throw new BadRequestException("Shop not found");
    }

    const productIds = Array.from(new Set(nextItems.map((item) => item.productId)));
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== productIds.length) {
      throw new NotFoundException("Product not found");
    }

    if (nextBranchId) {
      const stocks = await this.prisma.branchStock.findMany({
        where: { branchId: nextBranchId, productId: { in: productIds } },
      });
      const stockMap = new Map(stocks.map((s) => [s.productId, s.quantity]));
      for (const item of nextItems) {
        const qty = stockMap.get(item.productId) ?? 0;
        if (qty < item.quantity) {
          throw new BadRequestException("Insufficient branch stock");
        }
      }
    }

    const nextDate = dto.date ?? exists.date;
    if (!isISODate(nextDate)) throw new BadRequestException("Invalid date");
    const nextNote = dto.note !== undefined ? dto.note?.trim() || null : exists.note;

    return this.prisma.$transaction(async (tx) => {
      await tx.returnItem.deleteMany({ where: { returnId: exists.id } });
      await tx.returnItem.createMany({
        data: nextItems.map((item) => ({
          returnId: exists.id,
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      return tx.return.update({
        where: { id: exists.id },
        data: {
          date: nextDate,
          note: nextNote,
          sourceType: nextSourceType,
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
    await this.ensureSalesShiftOpen(user);

    const exists = await this.prisma.return.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Return not found");
    if (exists.status !== ReturnStatus.PENDING) {
      throw new BadRequestException("Only pending returns can be deleted");
    }

    if (user.role !== "ADMIN" && user.role !== "SALES") {
      throw new ForbiddenException("Forbidden");
    }

    if (user.role === "SALES") {
      if (exists.sourceType !== ReturnSourceType.BRANCH) {
        throw new ForbiddenException("Forbidden");
      }
      const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser?.branchId || dbUser.branchId !== exists.branchId) {
        throw new ForbiddenException("Forbidden");
      }
    }

    await this.prisma.return.delete({ where: { id: exists.id } });
    return { ok: true };
  }

  async approve(id: string, user: AuthUser) {
    if (user.role !== "ADMIN") {
      throw new ForbiddenException("Only admin can approve");
    }

    const ret = await this.prisma.return.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!ret) throw new NotFoundException("Return not found");
    if (ret.status !== ReturnStatus.PENDING) {
      throw new BadRequestException("Return already processed");
    }

    return this.prisma.$transaction(async (tx) => {
      const items = normalizeItems(ret.items);
      if (ret.branchId) {
        for (const item of items) {
          const updated = await tx.branchStock.updateMany({
            where: {
              branchId: ret.branchId,
              productId: item.productId,
              quantity: { gte: item.quantity },
            },
            data: { quantity: { decrement: item.quantity } },
          });
          if (updated.count !== 1) {
            throw new BadRequestException("Insufficient branch stock");
          }
        }
      }

      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      await tx.return.update({
        where: { id: ret.id },
        data: { status: ReturnStatus.APPROVED, approvedById: user.id },
      });

      return { ok: true };
    });
  }

  async reject(id: string, user: AuthUser) {
    if (user.role !== "ADMIN") {
      throw new ForbiddenException("Only admin can reject");
    }

    const ret = await this.prisma.return.findUnique({ where: { id } });
    if (!ret) throw new NotFoundException("Return not found");
    if (ret.status !== ReturnStatus.PENDING) {
      throw new BadRequestException("Return already processed");
    }

    await this.prisma.return.update({
      where: { id: ret.id },
      data: { status: ReturnStatus.REJECTED, approvedById: user.id },
    });
    return { ok: true };
  }
}
