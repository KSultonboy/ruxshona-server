import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

@Injectable()
export class ShopsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.shop.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateShopDto) {
    try {
      return await this.prisma.shop.create({
        data: {
          name: dto.name.trim(),
          address: dto.address?.trim() || null,
          phone: dto.phone?.trim() || null,
        },
      });
    } catch {
      throw new BadRequestException('Shop already exists');
    }
  }

  async update(id: string, dto: UpdateShopDto) {
    const exists = await this.prisma.shop.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Shop not found');
    await this.prisma.shop.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        address:
          dto.address === undefined ? undefined : dto.address.trim() || null,
        phone: dto.phone === undefined ? undefined : dto.phone.trim() || null,
      },
    });
    return { ok: true };
  }

  async remove(id: string) {
    const exists = await this.prisma.shop.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Shop not found');
    try {
      await this.prisma.shop.delete({ where: { id } });
      return { ok: true };
    } catch {
      throw new BadRequestException('Shop is in use.');
    }
  }
}
