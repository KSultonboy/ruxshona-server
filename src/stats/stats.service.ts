import { Injectable } from '@nestjs/common';
import { ReturnStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type StatsOverview = {
  productsCount: number;
  categoriesCount: number;
  expensesCount: number;
  branchValue: number;
  workersCount: number;
  branchShopCount: number;
  revenue: number;
  returns: number;
  received: number;
  expensesTotal: number;
  netProfit: number;
};

type DateRange = { from?: string; to?: string };

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async overview(range: DateRange = {}): Promise<StatsOverview> {
    const dateFilter =
      range.from || range.to
        ? {
            date: {
              ...(range.from ? { gte: range.from } : {}),
              ...(range.to ? { lte: range.to } : {}),
            },
          }
        : undefined;

    const [
      productsCount,
      categoriesCount,
      expensesCount,
      branches,
      shops,
      workersCount,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.productCategory.count(),
      this.prisma.expense.count({ where: dateFilter }),
      this.prisma.branch.findMany({ select: { id: true } }),
      this.prisma.shop.findMany({ select: { id: true } }),
      this.prisma.user.count(),
    ]);

    const branchStocks = await this.prisma.branchStock.findMany({
      include: { product: { select: { price: true, salePrice: true } } },
    });

    const branchValue = branchStocks.reduce((sum, stock) => {
      const price = stock.product?.salePrice ?? stock.product?.price ?? 0;
      return sum + price * stock.quantity;
    }, 0);

    const sales = await this.prisma.sale.findMany({
      where: dateFilter,
      select: { price: true, quantity: true },
    });
    const revenue = sales.reduce(
      (sum, sale) => sum + sale.price * sale.quantity,
      0,
    );

    const returnItems = await this.prisma.returnItem.findMany({
      where: {
        ret: {
          status: ReturnStatus.APPROVED,
          ...(dateFilter ? dateFilter : {}),
        },
      },
      include: { product: { select: { price: true, salePrice: true } } },
    });
    const returnsTotal = returnItems.reduce((sum, item) => {
      const price = item.product?.salePrice ?? item.product?.price ?? 0;
      return sum + price * item.quantity;
    }, 0);

    const expensesSum = await this.prisma.expense.aggregate({
      where: dateFilter,
      _sum: { amount: true },
    });
    const expensesTotal = expensesSum._sum.amount ?? 0;

    const branchShopCount = branches.length + shops.length;

    return {
      productsCount,
      categoriesCount,
      expensesCount,
      branchValue,
      workersCount,
      branchShopCount,
      revenue,
      returns: returnsTotal,
      received: revenue,
      expensesTotal,
      netProfit: revenue - expensesTotal,
    };
  }
}
