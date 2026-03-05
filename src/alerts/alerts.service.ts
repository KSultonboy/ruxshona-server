import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AlertRuleType,
  PaymentSourceType,
  TransferStatus,
  ReturnStatus,
  TransferTargetType,
  ReturnSourceType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function itemPrice(
  product?: { salePrice?: number | null; price?: number | null } | null,
) {
  return product?.salePrice ?? product?.price ?? 0;
}

function sumItems(
  items: {
    quantity: number;
    product?: { salePrice?: number | null; price?: number | null } | null;
  }[],
) {
  return items.reduce(
    (sum, item) => sum + item.quantity * itemPrice(item.product),
    0,
  );
}

function dateToTs(date: string) {
  const safe = date.length === 10 ? `${date}T00:00:00Z` : date;
  return new Date(safe).getTime();
}

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  listRules() {
    return this.prisma.alertRule.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });
  }

  async createRule(data: {
    type: AlertRuleType;
    threshold: number;
    branchId?: string | null;
    productId?: string | null;
    active?: boolean;
    note?: string;
  }) {
    if (!data.threshold || data.threshold < 0)
      throw new BadRequestException('Invalid threshold');
    return this.prisma.alertRule.create({
      data: {
        type: data.type,
        threshold: data.threshold,
        branchId: data.branchId ?? null,
        productId: data.productId ?? null,
        active: data.active ?? true,
        note: data.note?.trim() || null,
      },
    });
  }

  async updateRule(
    id: string,
    data: Partial<{
      threshold: number;
      active: boolean;
      note?: string;
    }>,
  ) {
    return this.prisma.alertRule.update({
      where: { id },
      data: {
        threshold: data.threshold,
        active: data.active,
        note: data.note?.trim() || null,
      },
    });
  }

  removeRule(id: string) {
    return this.prisma.alertRule.delete({ where: { id } });
  }

  async listAlerts() {
    const rules = await this.prisma.alertRule.findMany({
      where: { active: true },
      include: {
        branch: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });
    if (rules.length === 0) return [];

    const branchStockRules = rules.filter(
      (r) => r.type === AlertRuleType.BRANCH_STOCK_MIN,
    );
    const debtRules = rules.filter(
      (r) => r.type === AlertRuleType.BRANCH_DEBT_LIMIT,
    );
    const overdueRules = rules.filter(
      (r) => r.type === AlertRuleType.PAYMENT_OVERDUE_DAYS,
    );

    const alerts: any[] = [];

    if (branchStockRules.length) {
      const branchStockItems = await this.prisma.branchStock.findMany({
        include: {
          branch: { select: { id: true, name: true } },
          product: { select: { id: true, name: true } },
        },
      });

      branchStockRules.forEach((rule) => {
        const matches = branchStockItems.filter((item) => {
          if (rule.branchId && item.branchId !== rule.branchId) return false;
          if (rule.productId && item.productId !== rule.productId) return false;
          return item.quantity <= rule.threshold;
        });

        matches.forEach((item) => {
          alerts.push({
            type: rule.type,
            ruleId: rule.id,
            message: `Low stock: ${item.product?.name ?? 'Product'} (${item.quantity})`,
            branch: item.branch,
            product: item.product,
            value: item.quantity,
            threshold: rule.threshold,
          });
        });
      });
    }

    if (debtRules.length || overdueRules.length) {
      const transfers = await this.prisma.transfer.findMany({
        where: {
          status: TransferStatus.RECEIVED,
          targetType: TransferTargetType.BRANCH,
          branchId: { not: null },
        },
        include: {
          items: {
            include: { product: { select: { price: true, salePrice: true } } },
          },
        },
      });
      const returns = await this.prisma.return.findMany({
        where: {
          status: ReturnStatus.APPROVED,
          sourceType: ReturnSourceType.BRANCH,
          branchId: { not: null },
        },
        include: {
          items: {
            include: { product: { select: { price: true, salePrice: true } } },
          },
        },
      });
      const payments = await this.prisma.payment.findMany({
        where: {
          sourceType: PaymentSourceType.BRANCH,
          branchId: { not: null },
        },
      });

      const transferSum = new Map<string, number>();
      transfers.forEach((tr) => {
        if (!tr.branchId) return;
        const sum = sumItems(tr.items ?? []);
        transferSum.set(tr.branchId, (transferSum.get(tr.branchId) ?? 0) + sum);
      });

      const returnSum = new Map<string, number>();
      returns.forEach((ret) => {
        if (!ret.branchId) return;
        const sum = sumItems(ret.items ?? []);
        returnSum.set(ret.branchId, (returnSum.get(ret.branchId) ?? 0) + sum);
      });

      const paymentSum = new Map<string, number>();
      const paymentLatest = new Map<string, string>();
      payments.forEach((pay) => {
        if (!pay.branchId) return;
        paymentSum.set(
          pay.branchId,
          (paymentSum.get(pay.branchId) ?? 0) + pay.amount,
        );
        const prev = paymentLatest.get(pay.branchId);
        if (!prev || dateToTs(pay.date) > dateToTs(prev)) {
          paymentLatest.set(pay.branchId, pay.date);
        }
      });

      const branchIds = new Set<string>();
      [
        ...transferSum.keys(),
        ...returnSum.keys(),
        ...paymentSum.keys(),
      ].forEach((id) => branchIds.add(id));
      const branches = await this.prisma.branch.findMany({
        where: { id: { in: Array.from(branchIds) } },
      });
      const branchMap = new Map(branches.map((b) => [b.id, b]));

      const debtByBranch = new Map<string, number>();
      branchIds.forEach((id) => {
        const debt =
          (transferSum.get(id) ?? 0) -
          (returnSum.get(id) ?? 0) -
          (paymentSum.get(id) ?? 0);
        debtByBranch.set(id, debt);
      });

      debtRules.forEach((rule) => {
        const targetIds = rule.branchId
          ? [rule.branchId]
          : Array.from(branchIds);
        targetIds.forEach((branchId) => {
          const debt = debtByBranch.get(branchId) ?? 0;
          if (debt >= rule.threshold) {
            alerts.push({
              type: rule.type,
              ruleId: rule.id,
              message: `Debt limit exceeded (${debt})`,
              branch: branchMap.get(branchId) ?? null,
              value: debt,
              threshold: rule.threshold,
            });
          }
        });
      });

      if (overdueRules.length) {
        const lastTransferDate = new Map<string, string>();
        transfers.forEach((tr) => {
          if (!tr.branchId) return;
          const prev = lastTransferDate.get(tr.branchId);
          if (!prev || dateToTs(tr.date) > dateToTs(prev)) {
            lastTransferDate.set(tr.branchId, tr.date);
          }
        });

        overdueRules.forEach((rule) => {
          const targetIds = rule.branchId
            ? [rule.branchId]
            : Array.from(branchIds);
          targetIds.forEach((branchId) => {
            const debt = debtByBranch.get(branchId) ?? 0;
            if (debt <= 0) return;
            const lastPay =
              paymentLatest.get(branchId) ?? lastTransferDate.get(branchId);
            if (!lastPay) return;
            const daysSince = Math.floor(
              (Date.now() - dateToTs(lastPay)) / (24 * 60 * 60 * 1000),
            );
            if (daysSince >= rule.threshold) {
              alerts.push({
                type: rule.type,
                ruleId: rule.id,
                message: `Payment overdue (${daysSince} days)`,
                branch: branchMap.get(branchId) ?? null,
                value: daysSince,
                threshold: rule.threshold,
              });
            }
          });
        });
      }
    }

    return alerts;
  }
}
