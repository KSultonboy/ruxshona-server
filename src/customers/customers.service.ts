import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findByPhone(phone: string) {
    return this.prisma.customer.findUnique({
      where: { phone },
      select: {
        id: true,
        name: true,
        phone: true,
        passwordHash: true,
        address: true,
        birthday: true,
        points: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        birthday: true,
        points: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async updateProfile(customerId: string, dto: UpdateCustomerProfileDto) {
    const current = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!current) throw new NotFoundException('Customer not found');

    const data: Prisma.CustomerUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.address !== undefined) data.address = dto.address.trim() || null;
    if (dto.birthday !== undefined) data.birthday = dto.birthday.trim() || null;

    return this.prisma.customer.update({
      where: { id: customerId },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        birthday: true,
        points: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async register(dto: RegisterCustomerDto) {
    const existing = await this.findByPhone(dto.phone);
    if (existing) {
      throw new BadRequestException('This phone number is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      return await this.prisma.customer.create({
        data: {
          name: dto.name,
          phone: dto.phone,
          passwordHash,
          address: dto.address,
          birthday: dto.birthday,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
          birthday: true,
          points: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      const isMissingBirthdayColumn =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2022' &&
        String(error.meta?.column ?? '')
          .toLowerCase()
          .includes('customer.birthday');

      if (!isMissingBirthdayColumn) {
        throw error;
      }

      return this.prisma.customer.create({
        data: {
          name: dto.name,
          phone: dto.phone,
          passwordHash,
          address: dto.address,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
          birthday: true,
          points: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }
  }

  async getCustomerOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
      },
    });
  }

  async getCustomerMessages(customerId: string) {
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        trackCode: true,
        status: true,
        total: true,
        updatedAt: true,
      },
    });

    return orders.map((order) => {
      const code = order.trackCode || order.id.slice(-6).toUpperCase();
      if (order.status === 'IN_DELIVERY') {
        return {
          id: `${order.id}:delivery`,
          orderId: order.id,
          trackCode: code,
          status: order.status,
          title: 'Buyurtma qabul qilindi',
          body: `Buyurtmangiz qabul qilindi va yetkazib berishga yuborildi. Kod: ${code}.`,
          createdAt: order.updatedAt,
        };
      }
      if (order.status === 'DELIVERED') {
        return {
          id: `${order.id}:delivered`,
          orderId: order.id,
          trackCode: code,
          status: order.status,
          title: 'Buyurtma yetkazildi',
          body: `Buyurtmangiz muvaffaqiyatli yetkazildi. Kod: ${code}. Jami: ${order.total.toLocaleString()} so'm.`,
          createdAt: order.updatedAt,
        };
      }
      if (order.status === 'CANCELED') {
        return {
          id: `${order.id}:canceled`,
          orderId: order.id,
          trackCode: code,
          status: order.status,
          title: 'Buyurtma bekor qilindi',
          body: `Buyurtma bekor qilindi. Kod: ${code}. Qo'shimcha ma'lumot uchun operator bilan bog'laning.`,
          createdAt: order.updatedAt,
        };
      }
      return {
        id: `${order.id}:new`,
        orderId: order.id,
        trackCode: code,
        status: order.status,
        title: 'Buyurtma qabul qilindi',
        body: `Buyurtmangiz qabul qilindi. Kod: ${code}.`,
        createdAt: order.updatedAt,
      };
    });
  }
}
