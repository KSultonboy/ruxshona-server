import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.branch.findMany({ orderBy: { name: "asc" } });
  }

  async create(dto: CreateBranchDto) {
    try {
      return await this.prisma.branch.create({
        data: {
          name: dto.name.trim(),
          address: dto.address?.trim() || null,
          phone: dto.phone?.trim() || null,
          warehouseMode: dto.warehouseMode ?? "SEPARATE",
        },
      });
    } catch {
      throw new BadRequestException("Branch already exists");
    }
  }

  async update(id: string, dto: UpdateBranchDto) {
    const exists = await this.prisma.branch.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Branch not found");
    await this.prisma.branch.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        address: dto.address === undefined ? undefined : dto.address.trim() || null,
        phone: dto.phone === undefined ? undefined : dto.phone.trim() || null,
        warehouseMode: dto.warehouseMode,
      },
    });
    return { ok: true };
  }

  async remove(id: string) {
    const exists = await this.prisma.branch.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Branch not found");
    try {
      await this.prisma.branch.delete({ where: { id } });
      return { ok: true };
    } catch {
      throw new BadRequestException("Branch is in use.");
    }
  }
}
