import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async validate(code: string, userId: string, orderTotal: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase(), active: true },
    });

    if (!coupon)
      throw new BadRequestException('Kupon topilmadi yoki faol emas');

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('Kupon muddati tugagan');
    }

    if (coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Kupon foydalanish limiti tugagan');
    }

    if (orderTotal < coupon.minOrder) {
      throw new BadRequestException(
        `Minimal buyurtma miqdori: ${coupon.minOrder.toLocaleString()} so'm`,
      );
    }

    return coupon;
  }

  async useCoupon(id: string) {
    return this.prisma.coupon.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
  }

  async create(data: any) {
    return this.prisma.coupon.create({
      data: {
        ...data,
        code: data.code.toUpperCase(),
      },
    });
  }

  async remove(id: string) {
    await this.prisma.coupon.delete({ where: { id } });
    return { ok: true };
  }
}
