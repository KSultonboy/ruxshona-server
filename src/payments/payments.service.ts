import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentSourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { isISODate } from '../utils/date';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async list(filters: {
    from?: string;
    to?: string;
    sourceType?: PaymentSourceType;
    branchId?: string;
    shopId?: string;
  }) {
    if (filters.from && !isISODate(filters.from))
      throw new BadRequestException('Invalid from date');
    if (filters.to && !isISODate(filters.to))
      throw new BadRequestException('Invalid to date');
    const where: any = {};
    if (filters.sourceType) where.sourceType = filters.sourceType;
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.shopId) where.shopId = filters.shopId;
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = filters.from;
      if (filters.to) where.date.lte = filters.to;
    }
    const items = await this.prisma.payment.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        branch: { select: { id: true, name: true } },
        shop: { select: { id: true, name: true } },
      },
    });
    return items.map((item) => ({
      ...item,
      sourceId: item.branchId ?? item.shopId ?? '',
    }));
  }

  async create(dto: CreatePaymentDto, userId: string) {
    if (!dto.amount || dto.amount <= 0)
      throw new BadRequestException('Invalid amount');
    if (!isISODate(dto.date)) throw new BadRequestException('Invalid date');
    const sourceId = dto.sourceId?.trim();
    if (!sourceId) throw new BadRequestException('Source required');

    const data: any = {
      date: dto.date,
      sourceType: dto.sourceType,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      note: dto.note?.trim() || null,
      createdById: userId,
    };

    if (dto.sourceType === PaymentSourceType.BRANCH) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: sourceId },
      });
      if (!branch) throw new BadRequestException('Branch not found');
      data.branchId = sourceId;
    } else if (dto.sourceType === PaymentSourceType.SHOP) {
      const shop = await this.prisma.shop.findUnique({
        where: { id: sourceId },
      });
      if (!shop) throw new BadRequestException('Shop not found');
      data.shopId = sourceId;
    }

    const created = await this.prisma.payment.create({ data });
    return {
      ...created,
      sourceId: created.branchId ?? created.shopId ?? sourceId,
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.payment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Payment not found');
    await this.prisma.payment.delete({ where: { id } });
    return { ok: true };
  }
}
