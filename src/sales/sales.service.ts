import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { BranchWarehouseMode, PaymentMethod, ShiftStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { type AuthUser } from "../auth/guards/auth.guard";
import type { Express } from "express";
import { isISODate } from "../utils/date";
import { unlink } from "fs/promises";
import { basename, join } from "path";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type DateRange = { from?: string; to?: string; branchId?: string };
type BranchContext = {
  id: string;
  warehouseMode: BranchWarehouseMode;
};

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  private async tryDeleteShiftPhotoFile(photoUrl: string) {
    const clean = String(photoUrl || "").trim();
    if (!clean) return;
    const fileName = basename(clean.split("?")[0]);
    if (!fileName) return;
    const filePath = join(process.cwd(), "uploads", "shifts", fileName);
    try {
      await unlink(filePath);
    } catch {
      // If file is already missing, DB update is still enough.
    }
  }

  private async resolveBranchContext(user: AuthUser, branchId?: string): Promise<BranchContext> {
    if (user.role === "ADMIN" || user.role === "PRODUCTION") {
      if (!branchId) throw new BadRequestException("Branch required");
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true, warehouseMode: true },
      });
      if (!branch) throw new BadRequestException("Branch not found");
      return branch;
    }

    const userId = user.id ?? user.sub;
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { branchId: true },
    });
    if (!dbUser?.branchId) throw new ForbiddenException("Branch is not linked to user");
    if (branchId && branchId !== dbUser.branchId) throw new ForbiddenException("Forbidden");
    const branch = await this.prisma.branch.findUnique({
      where: { id: dbUser.branchId },
      select: { id: true, warehouseMode: true },
    });
    if (!branch) throw new BadRequestException("Branch not found");
    return branch;
  }

  async getBranchId(user: AuthUser, branchId?: string) {
    const branch = await this.resolveBranchContext(user, branchId);
    return branch.id;
  }

  async resolveBranchFilter(user: AuthUser, branchId?: string) {
    if (user.role === "ADMIN" || user.role === "PRODUCTION") {
      return branchId ?? null;
    }
    return this.getBranchId(user, branchId);
  }

  async ensureOpenShift(user: AuthUser) {
    if (user.role !== "SALES") return;
    const shift = await this.prisma.shift.findFirst({
      where: { openedById: user.id ?? user.sub, status: ShiftStatus.OPEN },
    });
    if (!shift) throw new ForbiddenException("Shift is closed");
  }

  async getOpenShift(user: AuthUser) {
    if (user.role !== "SALES") throw new ForbiddenException("Forbidden");
    return this.prisma.shift.findFirst({
      where: { openedById: user.id ?? user.sub, status: ShiftStatus.OPEN },
      orderBy: { createdAt: "desc" },
    });
  }

  async openShift(user: AuthUser) {
    if (user.role !== "SALES") throw new ForbiddenException("Forbidden");
    const existing = await this.getOpenShift(user);
    if (existing) return existing;

    const branchId = await this.getBranchId(user);
    return this.prisma.shift.create({
      data: {
        date: todayISO(),
        status: ShiftStatus.OPEN,
        photos: [],
        branchId,
        openedById: user.id ?? user.sub,
      },
    });
  }

  async closeShift(user: AuthUser) {
    if (user.role !== "SALES") throw new ForbiddenException("Forbidden");
    const shift = await this.getOpenShift(user);
    if (!shift) throw new BadRequestException("Shift not found");
    if (!shift.photos?.length) throw new BadRequestException("Shift photos required");
    return this.prisma.shift.update({
      where: { id: shift.id },
      data: { status: ShiftStatus.CLOSED, closedAt: new Date() },
    });
  }

  async addShiftPhotos(user: AuthUser, files: Express.Multer.File[]) {
    if (user.role !== "SALES") throw new ForbiddenException("Forbidden");
    const shift = await this.getOpenShift(user);
    if (!shift) throw new BadRequestException("Shift not found");
    const newUrls = files.map((file) => `/uploads/shifts/${file.filename}`);
    const combined = [...(shift.photos ?? []), ...newUrls].slice(0, 6);
    const updated = await this.prisma.shift.update({
      where: { id: shift.id },
      data: { photos: combined },
    });
    return { ok: true, photos: updated.photos };
  }

  async listUploadedShiftPhotos(user: AuthUser) {
    if (user.role !== "ADMIN") throw new ForbiddenException("Forbidden");

    return this.prisma.shift.findMany({
      where: { photos: { isEmpty: false } },
      include: {
        branch: { select: { id: true, name: true } },
        openedBy: { select: { id: true, username: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
  }

  async deleteShiftPhoto(user: AuthUser, shiftId: string, photo: string) {
    if (user.role !== "ADMIN") throw new ForbiddenException("Forbidden");
    const normalizedPhoto = String(photo || "").trim();
    if (!normalizedPhoto) throw new BadRequestException("Photo required");

    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      select: { id: true, photos: true },
    });
    if (!shift) throw new NotFoundException("Shift not found");

    const nextPhotos = (shift.photos ?? []).filter((item) => item !== normalizedPhoto);
    if (nextPhotos.length === (shift.photos ?? []).length) {
      throw new NotFoundException("Photo not found");
    }

    const updated = await this.prisma.shift.update({
      where: { id: shift.id },
      data: { photos: nextPhotos },
      select: { photos: true },
    });
    await this.tryDeleteShiftPhotoFile(normalizedPhoto);
    return { ok: true, photos: updated.photos };
  }

  async list(user: AuthUser, range: DateRange = {}) {
    const branchFilter = await this.resolveBranchFilter(user, range.branchId);
    if (range.from && !isISODate(range.from)) throw new BadRequestException("Invalid from date");
    if (range.to && !isISODate(range.to)) throw new BadRequestException("Invalid to date");
    const where: any = {};
    if (branchFilter) where.branchId = branchFilter;
    if (range.from || range.to) {
      where.date = {
        ...(range.from ? { gte: range.from } : {}),
        ...(range.to ? { lte: range.to } : {}),
      };
    }

    return this.prisma.sale.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            barcode: true,
            type: true,
            salePrice: true,
            price: true,
            unit: { select: { name: true, short: true } },
            images: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });
  }

  async branchStock(user: AuthUser, branchId?: string) {
    await this.ensureOpenShift(user);
    const resolvedBranch = await this.resolveBranchContext(user, branchId);

    if (resolvedBranch.warehouseMode === BranchWarehouseMode.CENTRAL) {
      const products = await this.prisma.product.findMany({
        where: { active: true, stock: { gt: 0 } },
        include: {
          unit: { select: { name: true, short: true } },
        },
        orderBy: { name: "asc" },
      });

      return products.map((product) => ({
        id: `central-${resolvedBranch.id}-${product.id}`,
        branchId: resolvedBranch.id,
        productId: product.id,
        quantity: product.stock,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        product: {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          type: product.type,
          salePrice: product.salePrice,
          price: product.price,
          unit: product.unit,
          images: product.images,
        },
      }));
    }

    return this.prisma.branchStock.findMany({
      where: { branchId: resolvedBranch.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            barcode: true,
            type: true,
            salePrice: true,
            price: true,
            unit: { select: { name: true, short: true } },
            images: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findByBarcode(user: AuthUser, barcode: string, branchId?: string) {
    await this.ensureOpenShift(user);
    const resolvedBranch = await this.resolveBranchContext(user, branchId);
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: { unit: { select: { name: true, short: true } } },
    });
    if (!product) throw new NotFoundException("Product not found");

    if (resolvedBranch.warehouseMode === BranchWarehouseMode.CENTRAL) {
      return {
        product,
        stock: {
          id: `central-${resolvedBranch.id}-${product.id}`,
          branchId: resolvedBranch.id,
          productId: product.id,
          quantity: product.stock,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        },
      };
    }

    const stock = await this.prisma.branchStock.findUnique({
      where: { branchId_productId: { branchId: resolvedBranch.id, productId: product.id } },
    });

    return { product, stock };
  }

  async sell(dto: CreateSaleDto, user: AuthUser) {
    await this.ensureOpenShift(user);
    const branch = await this.resolveBranchContext(user, dto.branchId);
    const branchId = branch.id;
    const barcode = dto.barcode?.trim();
    if (!barcode) throw new BadRequestException("Barcode required");
    const quantity = Number(dto.quantity.toFixed(3));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException("Invalid quantity");
    }
    const product = await this.prisma.product.findUnique({ where: { barcode } });
    if (!product) throw new NotFoundException("Product not found");
    const createdById = user.id ?? user.sub;
    const price = product.salePrice ?? product.price ?? 0;
    const date = dto.date ?? todayISO();
    if (!isISODate(date)) throw new BadRequestException("Invalid date");
    const paymentMethod: PaymentMethod = dto.paymentMethod;

    if (branch.warehouseMode === BranchWarehouseMode.CENTRAL) {
      if (product.stock < quantity) {
        throw new BadRequestException("Insufficient central stock");
      }

      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.product.updateMany({
          where: { id: product.id, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (updated.count !== 1) {
          throw new BadRequestException("Insufficient central stock");
        }

        return tx.sale.create({
          data: {
            date,
            quantity,
            paymentMethod,
            price,
            branchId,
            productId: product.id,
            createdById,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                type: true,
                salePrice: true,
                price: true,
                unit: { select: { name: true, short: true } },
                images: true,
              },
            },
          },
        });
      });
    }

    const stock = await this.prisma.branchStock.findUnique({
      where: { branchId_productId: { branchId, productId: product.id } },
    });
    if (!stock || stock.quantity < quantity) {
      throw new BadRequestException("Insufficient branch stock");
    }

    const sale = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.branchStock.updateMany({
        where: { id: stock.id, quantity: { gte: quantity } },
        data: { quantity: { decrement: quantity } },
      });
      if (updated.count !== 1) {
        throw new BadRequestException("Insufficient branch stock");
      }

      return tx.sale.create({
        data: {
          date,
          quantity,
          paymentMethod,
          price,
          branchId,
          productId: product.id,
          createdById,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              barcode: true,
              type: true,
              salePrice: true,
              price: true,
              unit: { select: { name: true, short: true } },
              images: true,
            },
          },
        },
      });
    });

    return sale;
  }
}
