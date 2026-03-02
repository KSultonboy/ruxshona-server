import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderChannel, OrderStatus, Prisma, ProductType } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { CreatePublicOrderDto } from "./dto/create-public-order.dto";
import { isISODate } from "../utils/date";

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) { }

  private todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  private normalize(value?: string | null) {
    const next = value?.trim();
    return next ? next : null;
  }

  private lineTotal(unitPrice: number, quantity: number) {
    return Math.round(unitPrice * quantity);
  }

  private async generateTrackCode() {
    for (let i = 0; i < 8; i += 1) {
      const code = `RX-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;
      const exists = await this.prisma.order.findUnique({
        where: { trackCode: code },
        select: { id: true },
      });
      if (!exists) return code;
    }
    throw new BadRequestException("Track code generation error");
  }

  async list(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
      },
    });
  }

  async create(dto: CreateOrderDto, userId: string) {
    if (!dto.customerName?.trim()) throw new BadRequestException("Customer name required");
    if (!dto.total || dto.total <= 0) throw new BadRequestException("Total must be greater than zero");

    const date = dto.date ?? this.todayISO();
    if (!isISODate(date)) throw new BadRequestException("Invalid date");

    const items = dto.items?.map((item) => {
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new BadRequestException("Invalid item quantity");
      const unitPrice = Number(item.unitPrice);
      if (!Number.isInteger(unitPrice) || unitPrice < 0) throw new BadRequestException("Invalid item price");

      return {
        productId: item.productId ?? null,
        productName: item.productName.trim(),
        quantity,
        unitPrice,
        lineTotal: item.lineTotal ?? this.lineTotal(unitPrice, quantity),
      };
    });

    const source = dto.source?.trim() || "ERP";

    return this.prisma.order.create({
      data: {
        trackCode: await this.generateTrackCode(),
        date,
        customerName: dto.customerName.trim(),
        phone: this.normalize(dto.phone),
        address: this.normalize(dto.address),
        source,
        channel: dto.channel ?? OrderChannel.OTHER,
        status: OrderStatus.NEW,
        total: dto.total,
        note: this.normalize(dto.note),
        createdById: userId,
        items: items?.length ? { create: items } : undefined,
      },
      include: {
        items: true,
      },
    });
  }

  async updateStatus(id: string, status: OrderStatus) {
    const exists = await this.prisma.order.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException("Order not found");

    const next = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: { status },
        include: { items: true },
      });

      if (status === OrderStatus.DELIVERED && order.customerId && order.total > 0) {
        const pointsToAdd = Math.floor(order.total * 0.01);
        if (pointsToAdd > 0) {
          const updatedCustomer = await tx.customer.update({
            where: { id: order.customerId },
            data: { points: { increment: pointsToAdd } },
          });
          await this.notifications.notifyPointsEarned(updatedCustomer.phone, pointsToAdd, updatedCustomer.points);
        }
      }

      return order;
    });

    if (next.phone) {
      await this.notifications.notifyOrderStatusChanged(next.phone, next.trackCode || next.id, status);
    }

    return next;
  }

  async listPublicCategories() {
    return this.prisma.productCategory.findMany({
      where: {
        products: {
          some: {
            type: ProductType.PRODUCT,
            active: true,
          },
        },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async listPublicProducts(filters: { categoryId?: string; q?: string; minPrice?: number; maxPrice?: number }) {
    const where: Prisma.ProductWhereInput = {
      type: ProductType.PRODUCT,
      active: true,
    };

    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.q?.trim()) {
      where.name = {
        contains: filters.q.trim(),
        mode: "insensitive",
      };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.AND = [
        {
          OR: [
            {
              salePrice: {
                not: null,
                gte: filters.minPrice,
                lte: filters.maxPrice,
              },
            },
            {
              AND: [
                { salePrice: null },
                {
                  price: {
                    not: null,
                    gte: filters.minPrice,
                    lte: filters.maxPrice,
                  },
                },
              ],
            },
          ],
        },
      ];
    }

    const items = await this.prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        barcode: true,
        images: true,
        categoryId: true,
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, short: true } },
        price: true,
        salePrice: true,
      },
    });

    return items.map((item) => ({
      ...item,
      currentPrice: item.salePrice ?? item.price ?? 0,
    }));
  }

  async createPublic(dto: CreatePublicOrderDto) {
    if (!dto.customerName?.trim()) throw new BadRequestException("Customer name required");
    if (!dto.items?.length) throw new BadRequestException("Items are required");

    const uniqueProductIds = Array.from(new Set(dto.items.map((item) => item.productId)));
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: uniqueProductIds },
        type: ProductType.PRODUCT,
        active: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
        salePrice: true,
      },
    });

    const productMap = new Map(products.map((item) => [item.id, item]));
    const orderItems = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new BadRequestException(`Product not found: ${item.productId}`);

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException(`Invalid quantity for ${product.name}`);
      }

      const unitPrice = product.salePrice ?? product.price ?? 0;
      if (unitPrice <= 0) {
        throw new BadRequestException(`Product price is invalid: ${product.name}`);
      }

      return {
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice,
        lineTotal: this.lineTotal(unitPrice, quantity),
      };
    });

    return this.prisma.$transaction(async (tx) => {
      let finalTotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
      let noteExtra = dto.note ? this.normalize(dto.note) : null;

      if (dto.couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: dto.couponCode.toUpperCase(), active: true },
        });
        if (coupon) {
          if (!coupon.expiresAt || coupon.expiresAt > new Date()) {
            if (coupon.usedCount < coupon.maxUses && finalTotal >= coupon.minOrder) {
              const discount = coupon.isPercent ? Math.floor(finalTotal * (coupon.discount / 100)) : coupon.discount;
              finalTotal = Math.max(0, finalTotal - discount);
              await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
              noteExtra = noteExtra ? `${noteExtra} (Coupon: ${coupon.code})` : `(Coupon: ${coupon.code})`;
            }
          }
        }
      }

      if (dto.pointsToUse && dto.pointsToUse > 0 && dto.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: dto.customerId } });
        if (customer && customer.points >= dto.pointsToUse) {
          const discount = Math.min(finalTotal, dto.pointsToUse);
          finalTotal -= discount;
          await tx.customer.update({
            where: { id: dto.customerId },
            data: { points: { decrement: discount } },
          });
          noteExtra = noteExtra ? `${noteExtra} (Points used: ${discount})` : `(Points used: ${discount})`;
        }
      }

      const order = await tx.order.create({
        data: {
          trackCode: await this.generateTrackCode(),
          date: this.todayISO(),
          customerName: dto.customerName.trim(),
          phone: this.normalize(dto.phone),
          address: this.normalize(dto.address),
          source: "WEBSITE",
          channel: OrderChannel.WEBSITE,
          status: OrderStatus.NEW,
          total: finalTotal,
          note: noteExtra,
          customerId: dto.customerId,
          items: {
            create: orderItems,
          },
        },
        select: {
          id: true,
          trackCode: true,
          total: true,
          status: true,
          createdAt: true,
          phone: true, // Need phone for notification
        },
      });

      if (order.phone) {
        await this.notifications.notifyOrderCreated(order.phone, order.trackCode || order.id, order.total);
      }
      return order;
    });
  }
}
