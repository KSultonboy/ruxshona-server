import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseItemDto } from './dto/create-expense-item.dto';
import { UpdateExpenseItemDto } from './dto/update-expense-item.dto';
import { ProductType } from '@prisma/client';

@Injectable()
export class ExpenseItemsService {
  constructor(private prisma: PrismaService) {}

  list(categoryId?: string) {
    return this.prisma.expenseItem.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: {
        product: { select: { id: true, name: true, salePrice: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateExpenseItemDto) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Name required');

    const category = await this.prisma.expenseCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new BadRequestException('Expense category not found');

    let productId = dto.productId ?? null;
    const salePrice = dto.salePrice ?? undefined;

    if (category.type === 'SELLABLE') {
      if (!productId) {
        const categoryId =
          category.productCategoryId ??
          (
            await this.prisma.productCategory.findFirst({
              orderBy: { name: 'asc' },
            })
          )?.id;
        if (!categoryId) {
          throw new BadRequestException(
            'Product category required for sellable expense item',
          );
        }
        const unit = await this.prisma.unit.findFirst({
          orderBy: { name: 'asc' },
        });
        if (!unit)
          throw new BadRequestException(
            'Unit required for sellable expense item',
          );

        const product = await this.prisma.product.create({
          data: {
            name,
            type: ProductType.UTILITY,
            categoryId,
            unitId: unit.id,
            active: true,
            images: [],
            stock: 0,
            minStock: 0,
            labourPrice: 0,
            salePrice,
          },
        });
        productId = product.id;
      } else {
        const product = await this.prisma.product.findUnique({
          where: { id: productId },
        });
        if (!product) throw new BadRequestException('Product not found');
        if (salePrice !== undefined) {
          await this.prisma.product.update({
            where: { id: productId },
            data: { salePrice },
          });
        }
      }
    } else {
      productId = null;
    }

    try {
      return await this.prisma.expenseItem.create({
        data: {
          name,
          categoryId: dto.categoryId,
          productId,
        },
      });
    } catch {
      throw new BadRequestException('Expense item already exists');
    }
  }

  async update(id: string, dto: UpdateExpenseItemDto) {
    const exists = await this.prisma.expenseItem.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Expense item not found');

    const nextCategoryId = dto.categoryId ?? exists.categoryId;
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id: nextCategoryId },
    });
    if (!category) throw new BadRequestException('Expense category not found');

    let productId = dto.productId ?? exists.productId ?? null;
    const salePrice = dto.salePrice ?? undefined;
    if (category.type === 'SELLABLE') {
      if (!productId)
        throw new BadRequestException(
          'Product required for sellable expense item',
        );
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) throw new BadRequestException('Product not found');
      if (salePrice !== undefined) {
        await this.prisma.product.update({
          where: { id: productId },
          data: { salePrice },
        });
      }
    } else {
      productId = null;
    }

    const name = dto.name?.trim();
    try {
      await this.prisma.expenseItem.update({
        where: { id },
        data: {
          name: name && name.length > 0 ? name : undefined,
          categoryId: nextCategoryId,
          productId,
        },
      });
      return { ok: true };
    } catch {
      throw new BadRequestException('Expense item update error');
    }
  }

  async remove(id: string) {
    const exists = await this.prisma.expenseItem.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Expense item not found');
    try {
      await this.prisma.expenseItem.delete({ where: { id } });
      return { ok: true };
    } catch {
      throw new BadRequestException('Expense item is in use');
    }
  }
}
