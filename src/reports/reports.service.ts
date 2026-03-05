import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ReturnSourceType,
  ReturnStatus,
  TransferStatus,
  TransferTargetType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type DateRange = { from?: string; to?: string };
type ReportMetric =
  | 'revenue'
  | 'expenses'
  | 'payments'
  | 'transfers'
  | 'returns'
  | 'netProfit'
  | 'debt';
type ReportGranularity = 'day' | 'week' | 'month';
type ReportSegmentBy =
  | 'branch'
  | 'shop'
  | 'product'
  | 'category'
  | 'paymentMethod'
  | 'sourceType';
type ReportFilters = DateRange & {
  branchId?: string;
  shopId?: string;
  productId?: string;
  categoryId?: string;
  paymentMethod?: string;
  sourceType?: string;
};
type ReportSeriesPoint = { start: string; end: string; value: number };
type ReportSegmentRow = { key: string; label: string; value: number };
type ReportExportData = { headers: string[]; rows: (string | number)[][] };

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

function buildDateWhere(range: DateRange) {
  if (!range.from && !range.to) return undefined;
  const where: any = {};
  if (range.from) where.gte = range.from;
  if (range.to) where.lte = range.to;
  return where;
}

function csvEscape(value: any) {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: any[][]) {
  const lines = [headers.map(csvEscape).join(',')];
  rows.forEach((row) => {
    lines.push(row.map(csvEscape).join(','));
  });
  return lines.join('\n');
}

function parseDate(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function formatDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = (day + 6) % 7;
  return addDays(date, -diff);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function resolveRange(items: { date: string }[], range: DateRange) {
  let from = range.from;
  let to = range.to;
  if (!from || !to) {
    let min = '';
    let max = '';
    for (const item of items) {
      if (!min || item.date < min) min = item.date;
      if (!max || item.date > max) max = item.date;
    }
    if (!from) from = min;
    if (!to) to = max;
  }
  if (!from && to) from = to;
  if (!to && from) to = from;
  if (!from || !to) {
    const today = formatDate(new Date());
    return { from: today, to: today };
  }
  if (from > to) {
    return { from: to, to: from };
  }
  return { from, to };
}

function buildBuckets(
  range: { from: string; to: string },
  granularity: ReportGranularity,
) {
  const buckets: { start: string; end: string }[] = [];
  const rangeStart = parseDate(range.from);
  const rangeEnd = parseDate(range.to);
  let cursor = rangeStart;
  if (granularity === 'week') {
    cursor = startOfWeek(cursor);
  } else if (granularity === 'month') {
    cursor = startOfMonth(cursor);
  }

  while (cursor <= rangeEnd) {
    const bucketStart = cursor;
    let bucketEnd = cursor;
    if (granularity === 'week') bucketEnd = addDays(bucketStart, 6);
    if (granularity === 'month') bucketEnd = endOfMonth(bucketStart);
    if (bucketEnd > rangeEnd) bucketEnd = rangeEnd;
    buckets.push({
      start: formatDate(bucketStart),
      end: formatDate(bucketEnd),
    });

    if (granularity === 'month') {
      cursor = new Date(
        bucketStart.getFullYear(),
        bucketStart.getMonth() + 1,
        1,
      );
    } else {
      cursor = addDays(bucketEnd, 1);
    }
  }
  return buckets;
}

function sumByKey<T>(
  items: T[],
  getKey: (item: T) => string | null | undefined,
  getLabel: (item: T) => string,
  getValue: (item: T) => number,
) {
  const map = new Map<string, ReportSegmentRow>();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    const entry = map.get(key) ?? { key, label: getLabel(item), value: 0 };
    entry.value += getValue(item);
    map.set(key, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

type MetricItem = { date: string; value: number };

function aggregateByDate(items: MetricItem[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.date, (map.get(item.date) ?? 0) + item.value);
  }
  return Array.from(map, ([date, value]) => ({ date, value })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

function buildSeries(
  items: MetricItem[],
  range: DateRange,
  granularity: ReportGranularity,
) {
  const daily = aggregateByDate(items);
  const resolved = resolveRange(daily, range);
  const buckets = buildBuckets(resolved, granularity);
  let idx = 0;
  const points: ReportSeriesPoint[] = buckets.map((bucket) => {
    let value = 0;
    while (idx < daily.length && daily[idx].date < bucket.start) idx += 1;
    while (idx < daily.length && daily[idx].date <= bucket.end) {
      value += daily[idx].value;
      idx += 1;
    }
    return { start: bucket.start, end: bucket.end, value };
  });
  return { points, range: resolved };
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private saleWhere(filters: ReportFilters) {
    const dateWhere = buildDateWhere(filters);
    const where: any = {};
    if (dateWhere) where.date = dateWhere;
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.productId) where.productId = filters.productId;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
    if (filters.categoryId) where.product = { categoryId: filters.categoryId };
    return where;
  }

  private expenseWhere(filters: ReportFilters) {
    const dateWhere = buildDateWhere(filters);
    const where: any = {};
    if (dateWhere) where.date = dateWhere;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
    return where;
  }

  private paymentWhere(filters: ReportFilters) {
    const dateWhere = buildDateWhere(filters);
    const where: any = {};
    if (dateWhere) where.date = dateWhere;
    if (filters.sourceType) where.sourceType = filters.sourceType;
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.shopId) where.shopId = filters.shopId;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
    return where;
  }

  private transferWhere(filters: ReportFilters) {
    const dateWhere = buildDateWhere(filters);
    const where: any = {};
    if (dateWhere) where.date = dateWhere;
    if (filters.branchId) {
      where.branchId = filters.branchId;
      where.targetType = TransferTargetType.BRANCH;
    }
    if (filters.shopId) {
      where.shopId = filters.shopId;
      where.targetType = TransferTargetType.SHOP;
    }
    return where;
  }

  private returnWhere(filters: ReportFilters) {
    const dateWhere = buildDateWhere(filters);
    const where: any = {};
    if (dateWhere) where.date = dateWhere;
    if (filters.branchId) {
      where.branchId = filters.branchId;
      where.sourceType = ReturnSourceType.BRANCH;
    }
    if (filters.shopId) {
      where.shopId = filters.shopId;
      where.sourceType = ReturnSourceType.SHOP;
    }
    return where;
  }

  private async metricItems(metric: ReportMetric, filters: ReportFilters) {
    switch (metric) {
      case 'revenue': {
        const sales = await this.prisma.sale.findMany({
          where: this.saleWhere(filters),
          select: { date: true, quantity: true, price: true },
        });
        return sales.map((s) => ({
          date: s.date,
          value: s.price * s.quantity,
        }));
      }
      case 'expenses': {
        const expenses = await this.prisma.expense.findMany({
          where: this.expenseWhere(filters),
          select: { date: true, amount: true },
        });
        return expenses.map((e) => ({ date: e.date, value: e.amount }));
      }
      case 'payments': {
        const payments = await this.prisma.payment.findMany({
          where: this.paymentWhere(filters),
          select: { date: true, amount: true },
        });
        return payments.map((p) => ({ date: p.date, value: p.amount }));
      }
      case 'transfers': {
        const transfers = await this.prisma.transfer.findMany({
          where: this.transferWhere(filters),
          select: {
            date: true,
            items: {
              select: {
                quantity: true,
                product: { select: { price: true, salePrice: true } },
              },
            },
          },
        });
        return transfers.map((t) => ({
          date: t.date,
          value: sumItems(t.items ?? []),
        }));
      }
      case 'returns': {
        const returns = await this.prisma.return.findMany({
          where: this.returnWhere(filters),
          select: {
            date: true,
            items: {
              select: {
                quantity: true,
                product: { select: { price: true, salePrice: true } },
              },
            },
          },
        });
        return returns.map((r) => ({
          date: r.date,
          value: sumItems(r.items ?? []),
        }));
      }
      case 'netProfit': {
        const rangeOnly = { from: filters.from, to: filters.to };
        const [sales, expenses] = await Promise.all([
          this.prisma.sale.findMany({
            where: this.saleWhere(rangeOnly),
            select: { date: true, quantity: true, price: true },
          }),
          this.prisma.expense.findMany({
            where: this.expenseWhere(rangeOnly),
            select: { date: true, amount: true },
          }),
        ]);
        return [
          ...sales.map((s) => ({ date: s.date, value: s.price * s.quantity })),
          ...expenses.map((e) => ({ date: e.date, value: -e.amount })),
        ];
      }
      case 'debt': {
        const rangeOnly = { from: filters.from, to: filters.to };
        const [payments, transfers, returns] = await Promise.all([
          this.prisma.payment.findMany({
            where: this.paymentWhere(rangeOnly),
            select: { date: true, amount: true },
          }),
          this.prisma.transfer.findMany({
            where: this.transferWhere(rangeOnly),
            select: {
              date: true,
              items: {
                select: {
                  quantity: true,
                  product: { select: { price: true, salePrice: true } },
                },
              },
            },
          }),
          this.prisma.return.findMany({
            where: this.returnWhere(rangeOnly),
            select: {
              date: true,
              items: {
                select: {
                  quantity: true,
                  product: { select: { price: true, salePrice: true } },
                },
              },
            },
          }),
        ]);
        return [
          ...transfers.map((t) => ({
            date: t.date,
            value: sumItems(t.items ?? []),
          })),
          ...returns.map((r) => ({
            date: r.date,
            value: -sumItems(r.items ?? []),
          })),
          ...payments.map((p) => ({ date: p.date, value: -p.amount })),
        ];
      }
      default:
        throw new BadRequestException('Unknown metric');
    }
  }

  async overview(range: DateRange) {
    const dateWhere = buildDateWhere(range);

    const [sales, expenseAgg, paymentAgg, transfers, returns] =
      await Promise.all([
        this.prisma.sale.findMany({
          where: dateWhere ? { date: dateWhere } : undefined,
          select: { price: true, quantity: true },
        }),
        this.prisma.expense.aggregate({
          where: dateWhere ? { date: dateWhere } : undefined,
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: dateWhere ? { date: dateWhere } : undefined,
          _sum: { amount: true },
        }),
        this.prisma.transfer.findMany({
          where: {
            status: TransferStatus.RECEIVED,
            targetType: TransferTargetType.BRANCH,
            ...(dateWhere ? { date: dateWhere } : {}),
          },
          select: {
            items: {
              select: {
                quantity: true,
                product: { select: { price: true, salePrice: true } },
              },
            },
          },
        }),
        this.prisma.return.findMany({
          where: {
            status: ReturnStatus.APPROVED,
            sourceType: ReturnSourceType.BRANCH,
            ...(dateWhere ? { date: dateWhere } : {}),
          },
          select: {
            items: {
              select: {
                quantity: true,
                product: { select: { price: true, salePrice: true } },
              },
            },
          },
        }),
      ]);

    const revenue = sales.reduce((sum, s) => sum + s.price * s.quantity, 0);
    const expensesTotal = expenseAgg._sum.amount ?? 0;
    const paymentsTotal = paymentAgg._sum.amount ?? 0;
    const transfersTotal = transfers.reduce(
      (sum, t) => sum + sumItems(t.items ?? []),
      0,
    );
    const returnsTotal = returns.reduce(
      (sum, r) => sum + sumItems(r.items ?? []),
      0,
    );
    const netProfit = revenue - expensesTotal;
    const debtTotal = transfersTotal - returnsTotal - paymentsTotal;

    return {
      revenue,
      expensesTotal,
      paymentsTotal,
      transfersTotal,
      returnsTotal,
      netProfit,
      debtTotal,
    };
  }

  async timeseries(
    params: {
      metric: ReportMetric;
      granularity: ReportGranularity;
    } & ReportFilters,
  ) {
    const { metric, granularity, ...filters } = params;
    if (!['day', 'week', 'month'].includes(granularity)) {
      throw new BadRequestException('Unknown granularity');
    }
    const items = await this.metricItems(metric, filters);
    const { points } = buildSeries(items, filters, granularity);
    return { metric, granularity, points };
  }

  async segments(
    params: {
      metric: ReportMetric;
      segmentBy: ReportSegmentBy;
    } & ReportFilters,
  ) {
    const { metric, segmentBy, ...filters } = params;
    switch (metric) {
      case 'revenue': {
        const sales = await this.prisma.sale.findMany({
          where: this.saleWhere(filters),
          select: {
            branchId: true,
            productId: true,
            paymentMethod: true,
            price: true,
            quantity: true,
            branch: { select: { id: true, name: true } },
            product: {
              select: {
                id: true,
                name: true,
                category: { select: { id: true, name: true } },
                categoryId: true,
              },
            },
          },
        });
        if (segmentBy === 'branch') {
          return sumByKey(
            sales,
            (s) => s.branchId,
            (s) => s.branch?.name ?? 'Unknown',
            (s) => s.price * s.quantity,
          );
        }
        if (segmentBy === 'product') {
          return sumByKey(
            sales,
            (s) => s.productId,
            (s) => s.product?.name ?? 'Unknown',
            (s) => s.price * s.quantity,
          );
        }
        if (segmentBy === 'category') {
          return sumByKey(
            sales,
            (s) => s.product?.categoryId,
            (s) => s.product?.category?.name ?? 'Unknown',
            (s) => s.price * s.quantity,
          );
        }
        if (segmentBy === 'paymentMethod') {
          return sumByKey(
            sales,
            (s) => s.paymentMethod,
            (s) => s.paymentMethod,
            (s) => s.price * s.quantity,
          );
        }
        return [];
      }
      case 'expenses': {
        const expenses = await this.prisma.expense.findMany({
          where: this.expenseWhere(filters),
          select: {
            categoryId: true,
            paymentMethod: true,
            amount: true,
            category: { select: { id: true, name: true } },
          },
        });
        if (segmentBy === 'category') {
          return sumByKey(
            expenses,
            (e) => e.categoryId,
            (e) => e.category?.name ?? 'Unknown',
            (e) => e.amount,
          );
        }
        if (segmentBy === 'paymentMethod') {
          return sumByKey(
            expenses,
            (e) => e.paymentMethod,
            (e) => e.paymentMethod,
            (e) => e.amount,
          );
        }
        return [];
      }
      case 'payments': {
        const payments = await this.prisma.payment.findMany({
          where: this.paymentWhere(filters),
          select: {
            sourceType: true,
            branchId: true,
            shopId: true,
            paymentMethod: true,
            amount: true,
            branch: { select: { id: true, name: true } },
            shop: { select: { id: true, name: true } },
          },
        });
        if (segmentBy === 'sourceType') {
          return sumByKey(
            payments,
            (p) => p.sourceType,
            (p) => p.sourceType,
            (p) => p.amount,
          );
        }
        if (segmentBy === 'branch') {
          return sumByKey(
            payments,
            (p) => p.branchId,
            (p) => p.branch?.name ?? 'Unknown',
            (p) => p.amount,
          );
        }
        if (segmentBy === 'shop') {
          return sumByKey(
            payments,
            (p) => p.shopId,
            (p) => p.shop?.name ?? 'Unknown',
            (p) => p.amount,
          );
        }
        if (segmentBy === 'paymentMethod') {
          return sumByKey(
            payments,
            (p) => p.paymentMethod,
            (p) => p.paymentMethod,
            (p) => p.amount,
          );
        }
        return [];
      }
      case 'transfers': {
        const transfers = await this.prisma.transfer.findMany({
          where: this.transferWhere(filters),
          select: {
            branchId: true,
            shopId: true,
            branch: { select: { id: true, name: true } },
            shop: { select: { id: true, name: true } },
            items: {
              select: {
                quantity: true,
                product: { select: { price: true, salePrice: true } },
              },
            },
          },
        });
        if (segmentBy === 'branch') {
          return sumByKey(
            transfers,
            (t) => t.branchId,
            (t) => t.branch?.name ?? 'Unknown',
            (t) => sumItems(t.items ?? []),
          );
        }
        if (segmentBy === 'shop') {
          return sumByKey(
            transfers,
            (t) => t.shopId,
            (t) => t.shop?.name ?? 'Unknown',
            (t) => sumItems(t.items ?? []),
          );
        }
        return [];
      }
      case 'returns': {
        const returns = await this.prisma.return.findMany({
          where: this.returnWhere(filters),
          select: {
            branchId: true,
            shopId: true,
            branch: { select: { id: true, name: true } },
            shop: { select: { id: true, name: true } },
            items: {
              select: {
                quantity: true,
                product: { select: { price: true, salePrice: true } },
              },
            },
          },
        });
        if (segmentBy === 'branch') {
          return sumByKey(
            returns,
            (r) => r.branchId,
            (r) => r.branch?.name ?? 'Unknown',
            (r) => sumItems(r.items ?? []),
          );
        }
        if (segmentBy === 'shop') {
          return sumByKey(
            returns,
            (r) => r.shopId,
            (r) => r.shop?.name ?? 'Unknown',
            (r) => sumItems(r.items ?? []),
          );
        }
        return [];
      }
      default:
        return [];
    }
  }

  async exportData(
    type: string,
    filters: ReportFilters,
  ): Promise<ReportExportData> {
    switch (type) {
      case 'sales': {
        const sales = await this.prisma.sale.findMany({
          where: this.saleWhere(filters),
          select: {
            date: true,
            quantity: true,
            price: true,
            paymentMethod: true,
            branch: { select: { name: true } },
            product: { select: { name: true } },
          },
          orderBy: { date: 'desc' },
        });
        const rows = sales.map((s) => [
          s.date,
          s.branch?.name ?? '',
          s.product?.name ?? '',
          s.quantity,
          s.price,
          s.price * s.quantity,
          s.paymentMethod,
        ]);
        return {
          headers: [
            'date',
            'branch',
            'product',
            'qty',
            'price',
            'total',
            'paymentMethod',
          ],
          rows,
        };
      }
      case 'expenses': {
        const expenses = await this.prisma.expense.findMany({
          where: this.expenseWhere(filters),
          select: {
            date: true,
            amount: true,
            paymentMethod: true,
            note: true,
            category: { select: { name: true } },
          },
          orderBy: { date: 'desc' },
        });
        const rows = expenses.map((e) => [
          e.date,
          e.category?.name ?? '',
          e.amount,
          e.paymentMethod,
          e.note ?? '',
        ]);
        return {
          headers: ['date', 'category', 'amount', 'paymentMethod', 'note'],
          rows,
        };
      }
      case 'payments': {
        const payments = await this.prisma.payment.findMany({
          where: this.paymentWhere(filters),
          select: {
            date: true,
            sourceType: true,
            amount: true,
            paymentMethod: true,
            note: true,
            branch: { select: { name: true } },
            shop: { select: { name: true } },
          },
          orderBy: { date: 'desc' },
        });
        const rows = payments.map((p) => [
          p.date,
          p.sourceType,
          p.branch?.name ?? p.shop?.name ?? '',
          p.amount,
          p.paymentMethod,
          p.note ?? '',
        ]);
        return {
          headers: [
            'date',
            'sourceType',
            'sourceName',
            'amount',
            'paymentMethod',
            'note',
          ],
          rows,
        };
      }
      case 'transfers': {
        const transfers = await this.prisma.transfer.findMany({
          where: this.transferWhere(filters),
          select: {
            date: true,
            targetType: true,
            status: true,
            branch: { select: { name: true } },
            shop: { select: { name: true } },
            items: {
              select: {
                quantity: true,
                product: { select: { price: true, salePrice: true } },
              },
            },
          },
          orderBy: { date: 'desc' },
        });
        const rows = transfers.map((t) => [
          t.date,
          t.targetType,
          t.branch?.name ?? t.shop?.name ?? '',
          t.status,
          sumItems(t.items ?? []),
        ]);
        return {
          headers: ['date', 'targetType', 'targetName', 'status', 'total'],
          rows,
        };
      }
      case 'returns': {
        const returns = await this.prisma.return.findMany({
          where: this.returnWhere(filters),
          select: {
            date: true,
            sourceType: true,
            status: true,
            branch: { select: { name: true } },
            shop: { select: { name: true } },
            items: {
              select: {
                quantity: true,
                product: { select: { price: true, salePrice: true } },
              },
            },
          },
          orderBy: { date: 'desc' },
        });
        const rows = returns.map((r) => [
          r.date,
          r.sourceType,
          r.branch?.name ?? r.shop?.name ?? '',
          r.status,
          sumItems(r.items ?? []),
        ]);
        return {
          headers: ['date', 'sourceType', 'sourceName', 'status', 'total'],
          rows,
        };
      }
      default:
        throw new BadRequestException('Unknown export type');
    }
  }

  async exportCsv(type: string, filters: ReportFilters) {
    const data = await this.exportData(type, filters);
    return toCsv(data.headers, data.rows);
  }
}
