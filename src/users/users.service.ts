import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        roleLabel: true,
        active: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(dto: CreateUserDto) {
    if (dto.role === 'SALES' && !dto.branchId) {
      throw new BadRequestException('Branch required for sales user');
    }
    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
      });
      if (!branch) throw new BadRequestException('Branch not found');
    }
    try {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      return await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          username: dto.username.trim(),
          passwordHash,
          role: dto.role,
          roleLabel: dto.roleLabel?.trim() || null,
          active: true,
          branchId: dto.role === 'SALES' ? (dto.branchId ?? null) : null,
        },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          roleLabel: true,
          active: true,
          branchId: true,
          branch: { select: { id: true, name: true } },
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch {
      throw new BadRequestException('User create error');
    }
  }

  async update(id: string, dto: UpdateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('User not found');

    const nextRole = dto.role ?? exists.role;
    const nextBranchId = dto.branchId ?? exists.branchId ?? null;
    if (nextRole === 'SALES' && !nextBranchId) {
      throw new BadRequestException('Branch required for sales user');
    }
    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
      });
      if (!branch) throw new BadRequestException('Branch not found');
    }

    try {
      const data: any = {
        name: dto.name ? dto.name.trim() : undefined,
        username: dto.username ? dto.username.trim() : undefined,
        role: dto.role,
        roleLabel:
          dto.roleLabel === undefined
            ? undefined
            : dto.roleLabel.trim() || null,
        active: dto.active,
      };
      if (dto.password) {
        data.passwordHash = await bcrypt.hash(dto.password, 10);
      }
      if (nextRole === 'SALES') {
        data.branchId = dto.branchId ?? exists.branchId ?? null;
      } else {
        data.branchId = null;
      }
      await this.prisma.user.update({ where: { id }, data });
      return { ok: true };
    } catch {
      throw new BadRequestException('User update error');
    }
  }

  async remove(id: string) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('User not found');

    if (exists.protected) {
      throw new BadRequestException(
        'This system user is protected and cannot be deleted',
      );
    }

    // Physical deletion isn't used in UI yet, but we block it via service too.
    // For now, setting active to false as per existing logic.
    await this.prisma.user.update({
      where: { id },
      data: { active: false },
    });
    return { ok: true };
  }
}
