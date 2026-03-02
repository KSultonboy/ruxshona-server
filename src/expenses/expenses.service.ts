import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";
import { isISODate } from "../utils/date";

@Injectable()
export class ExpensesService {
    constructor(private prisma: PrismaService) { }

    list() {
        return this.prisma.expense.findMany({
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            include: { expenseItem: true },
        });
    }

  async create(dto: CreateExpenseDto) {
    if (!isISODate(dto.date)) throw new BadRequestException("Invalid date");
    try {
      const category = await this.prisma.expenseCategory.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new BadRequestException("Expense category not found");

      if (!dto.expenseItemId) throw new BadRequestException("Expense item required");
      const expenseItem = await this.prisma.expenseItem.findUnique({ where: { id: dto.expenseItemId } });
      if (!expenseItem) throw new BadRequestException("Expense item not found");
      if (expenseItem.categoryId !== dto.categoryId) {
        throw new BadRequestException("Expense item category mismatch");
      }

      const baseData: any = {
        date: dto.date,
        categoryId: dto.categoryId,
        amount: dto.amount ?? 0,
        paymentMethod: dto.paymentMethod,
        note: dto.note?.trim() || null,
        expenseItemId: dto.expenseItemId,
      };

      if (category.type === "SELLABLE") {
        const productId = expenseItem.productId;
        if (!productId) throw new BadRequestException("Product required for sellable expense");
        const qty = dto.quantity ?? 0;
        if (qty <= 0) throw new BadRequestException("Quantity required for sellable expense");

        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product) throw new BadRequestException("Product not found");

        return await this.prisma.$transaction(async (tx) => {
          const expense = await tx.expense.create({
            data: {
              ...baseData,
              productId,
              quantity: qty,
            },
          });

          await tx.stockMovement.create({
            data: {
              productId,
              date: dto.date,
              type: "IN",
              quantity: qty,
              note: `Expense stock in (${category.name})`,
            },
          });

          await tx.product.update({
            where: { id: productId },
            data: { stock: { increment: qty } },
          });

          return expense;
        });
      }

      if (!dto.amount || dto.amount <= 0) {
        throw new BadRequestException("Amount required for normal expense");
      }
      return await this.prisma.expense.create({ data: baseData });
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException("Expense create error (check categoryId)");
    }
  }

  async update(id: string, dto: UpdateExpenseDto) {
    const exists = await this.prisma.expense.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Expense not found");
    if (dto.date && !isISODate(dto.date)) throw new BadRequestException("Invalid date");

    try {
      const nextCategoryId = dto.categoryId ?? exists.categoryId;
      const category = await this.prisma.expenseCategory.findUnique({ where: { id: nextCategoryId } });
      if (!category) throw new BadRequestException("Expense category not found");

      if (category.type === "SELLABLE") {
        const nextExpenseItemId = dto.expenseItemId ?? exists.expenseItemId;
        if (!nextExpenseItemId) throw new BadRequestException("Expense item required");
        const expenseItem = await this.prisma.expenseItem.findUnique({ where: { id: nextExpenseItemId } });
        if (!expenseItem) throw new BadRequestException("Expense item not found");
        if (expenseItem.categoryId !== nextCategoryId) {
          throw new BadRequestException("Expense item category mismatch");
        }

        const nextProductId = expenseItem.productId;
        const nextQuantity = dto.quantity ?? exists.quantity;

        if (!nextProductId) throw new BadRequestException("Product required for sellable expense");
        if (!nextQuantity || nextQuantity <= 0) throw new BadRequestException("Quantity required for sellable expense");

        return await this.prisma.$transaction(async (tx) => {
          await tx.expense.update({
            where: { id },
            data: {
              ...dto,
              categoryId: nextCategoryId,
              expenseItemId: nextExpenseItemId,
              productId: nextProductId,
              quantity: nextQuantity,
              note: dto.note === undefined ? undefined : dto.note?.trim() || null,
            },
          });

          const prevProductId = exists.productId ?? nextProductId;
          const prevQuantity = exists.quantity ?? 0;

          if (prevProductId !== nextProductId) {
            await tx.product.update({
              where: { id: prevProductId },
              data: { stock: { decrement: prevQuantity } },
            });
            await tx.stockMovement.create({
              data: {
                productId: prevProductId,
                date: dto.date ?? exists.date,
                type: "OUT",
                quantity: prevQuantity,
                note: `Expense update out (${category.name})`,
              },
            });
            await tx.product.update({
              where: { id: nextProductId },
              data: { stock: { increment: nextQuantity } },
            });
            await tx.stockMovement.create({
              data: {
                productId: nextProductId,
                date: dto.date ?? exists.date,
                type: "IN",
                quantity: nextQuantity,
                note: `Expense update in (${category.name})`,
              },
            });
          } else {
            const diff = nextQuantity - prevQuantity;
            if (diff !== 0) {
              const type = diff > 0 ? "IN" : "OUT";
              await tx.product.update({
                where: { id: nextProductId },
                data: { stock: { increment: diff } },
              });
              await tx.stockMovement.create({
                data: {
                  productId: nextProductId,
                  date: dto.date ?? exists.date,
                  type,
                  quantity: Math.abs(diff),
                  note: `Expense quantity adjust (${category.name})`,
                },
              });
            }
          }

          return { ok: true };
        });
      }

      const nextExpenseItemId = dto.expenseItemId ?? exists.expenseItemId;
      if (!nextExpenseItemId) throw new BadRequestException("Expense item required");
      const expenseItem = await this.prisma.expenseItem.findUnique({ where: { id: nextExpenseItemId } });
      if (!expenseItem) throw new BadRequestException("Expense item not found");
      if (expenseItem.categoryId !== nextCategoryId) {
        throw new BadRequestException("Expense item category mismatch");
      }

      const nextAmount = dto.amount ?? exists.amount;
      if (!nextAmount || nextAmount <= 0) {
        throw new BadRequestException("Amount required for normal expense");
      }

      await this.prisma.expense.update({
        where: { id },
        data: {
          ...dto,
          categoryId: nextCategoryId,
          expenseItemId: nextExpenseItemId,
          productId: null,
          quantity: null,
          amount: nextAmount,
          note: dto.note === undefined ? undefined : dto.note?.trim() || null,
        },
      });
      return { ok: true };
    } catch {
      throw new BadRequestException("Expense update error");
    }
  }

  async remove(id: string) {
    const exists = await this.prisma.expense.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Expense not found");
    if (exists.productId && exists.quantity && exists.quantity > 0) {
      await this.prisma.$transaction(async (tx) => {
        await tx.expense.delete({ where: { id } });
        await tx.product.update({
          where: { id: exists.productId as string },
          data: { stock: { decrement: exists.quantity as number } },
        });
        await tx.stockMovement.create({
          data: {
            productId: exists.productId as string,
            date: exists.date,
            type: "OUT",
            quantity: exists.quantity as number,
            note: "Expense deleted (stock rollback)",
          },
        });
      });
      return { ok: true };
    }

    await this.prisma.expense.delete({ where: { id } });
    return { ok: true };
  }
}
