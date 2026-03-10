import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CashbackTransactionType, type PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { type AuthUser } from '../auth/guards/auth.guard';
import { SyncTelegramCashbackUserDto } from './dto/sync-telegram-cashback-user.dto';
import { AwardCashbackDto } from './dto/award-cashback.dto';
import { UpdateTelegramMembershipDto } from './dto/update-membership.dto';
import { SettleCashbackDto } from './dto/settle-cashback.dto';

@Injectable()
export class TelegramCashbackService {
  private readonly logger = new Logger(TelegramCashbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncBotUser(dto: SyncTelegramCashbackUserDto) {
    const telegramId = dto.telegramId.trim();
    if (!telegramId) throw new BadRequestException('telegramId required');

    const existing = await this.prisma.telegramCashbackUser.findUnique({
      where: { telegramId },
    });

    if (existing) {
      return this.prisma.telegramCashbackUser.update({
        where: { telegramId },
        data: {
          username: dto.username?.trim() || null,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName?.trim() || null,
        },
      });
    }

    return this.prisma.telegramCashbackUser.create({
      data: {
        telegramId,
        username: dto.username?.trim() || null,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName?.trim() || null,
        barcode: await this.generateUniqueBarcode(),
      },
    });
  }

  async getBotProfile(telegramId: string) {
    const user = await this.prisma.telegramCashbackUser.findUnique({
      where: { telegramId: telegramId.trim() },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) throw new NotFoundException('Telegram cashback user not found');
    return user;
  }

  async updateMembership(telegramId: string, dto: UpdateTelegramMembershipDto) {
    const user = await this.prisma.telegramCashbackUser.findUnique({
      where: { telegramId: telegramId.trim() },
    });

    if (!user) throw new NotFoundException('Telegram cashback user not found');

    return this.prisma.telegramCashbackUser.update({
      where: { telegramId: telegramId.trim() },
      data: {
        verifiedMember: dto.verifiedMember,
        lastMembershipStatus: dto.lastMembershipStatus ?? user.lastMembershipStatus,
        lastMembershipCheckAt: new Date(),
      },
    });
  }

  async lookupByBarcode(barcode: string) {
    const normalized = barcode.trim();
    if (!normalized) throw new BadRequestException('Barcode required');

    const user = await this.prisma.telegramCashbackUser.findUnique({
      where: { barcode: normalized },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        barcode: true,
        balance: true,
        verifiedMember: true,
      },
    });

    if (!user) throw new NotFoundException('Cashback barcode not found');
    return user;
  }

  async listUsers(input?: { q?: string; limit?: string }) {
    const q = (input?.q ?? '').trim();
    const parsedLimit = Number(input?.limit ?? 100);
    const take = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(500, Math.floor(parsedLimit)))
      : 100;

    const where = q
      ? {
          OR: [
            { barcode: { contains: q, mode: 'insensitive' as const } },
            { firstName: { contains: q, mode: 'insensitive' as const } },
            { lastName: { contains: q, mode: 'insensitive' as const } },
            { username: { contains: q, mode: 'insensitive' as const } },
            { telegramId: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const users = await this.prisma.telegramCashbackUser.findMany({
      where,
      take,
      orderBy: [{ balance: 'desc' }, { updatedAt: 'desc' }],
      include: {
        transactions: {
          select: {
            type: true,
            amount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!users.length) return [];

    const userIds = users.map((user) => user.id);
    const grouped = await this.prisma.cashbackTransaction.groupBy({
      by: ['telegramCashbackUserId', 'type'],
      where: {
        telegramCashbackUserId: { in: userIds },
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    });

    const summaryMap = new Map<
      string,
      { totalEarned: number; totalRedeemed: number; transactionCount: number }
    >();

    for (const row of grouped) {
      const prev = summaryMap.get(row.telegramCashbackUserId) ?? {
        totalEarned: 0,
        totalRedeemed: 0,
        transactionCount: 0,
      };
      const amount = row._sum.amount ?? 0;
      if (row.type === CashbackTransactionType.EARN) {
        prev.totalEarned += amount;
      } else if (row.type === CashbackTransactionType.REDEEM) {
        prev.totalRedeemed += amount;
      }
      prev.transactionCount += row._count._all ?? 0;
      summaryMap.set(row.telegramCashbackUserId, prev);
    }

    return users.map((user) => {
      const summary = summaryMap.get(user.id) ?? {
        totalEarned: 0,
        totalRedeemed: 0,
        transactionCount: 0,
      };
      return {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        barcode: user.barcode,
        balance: user.balance,
        verifiedMember: user.verifiedMember,
        lastMembershipStatus: user.lastMembershipStatus,
        lastMembershipCheckAt: user.lastMembershipCheckAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        transactionCount: summary.transactionCount,
        totalEarned: summary.totalEarned,
        totalRedeemed: summary.totalRedeemed,
        lastTransaction: user.transactions[0] ?? null,
      };
    });
  }

  async awardCashback(dto: AwardCashbackDto, user: AuthUser) {
    const settled = await this.settleCashback(
      {
        barcode: dto.barcode,
        saleIds: dto.saleIds,
        redeemedAmount: 0,
      },
      user,
    );

    return {
      ok: true,
      amount: settled.earnedAmount,
      balance: settled.balance,
      ratePercent: settled.ratePercent,
      saleAmount: settled.eligibleAmount,
      transactionId: settled.earnTransactionId,
      user: settled.user,
    };
  }

  async settleCashback(dto: SettleCashbackDto, user: AuthUser) {
    const barcode = dto.barcode.trim();
    if (!barcode) throw new BadRequestException('Barcode required');

    const saleIds = Array.from(new Set(dto.saleIds.map((item) => item.trim()).filter(Boolean)));
    if (saleIds.length === 0) throw new BadRequestException('saleIds required');

    const requestedRedeemedAmount = Math.max(0, Math.floor(Number(dto.redeemedAmount ?? 0)));
    const cashbackUser = await this.prisma.telegramCashbackUser.findUnique({
      where: { barcode },
    });
    if (!cashbackUser) throw new BadRequestException('Cashback barcode not found');

    const sales = await this.prisma.sale.findMany({
      where: { id: { in: saleIds } },
      include: {
        branch: { select: { id: true, name: true } },
        product: { select: { name: true } },
      },
    });

    if (sales.length !== saleIds.length) {
      throw new BadRequestException('Some sales not found');
    }

    const actorId = user.id ?? user.sub;
    if (user.role === 'SALES' && sales.some((sale) => sale.createdById !== actorId)) {
      throw new ForbiddenException('You can only settle cashback for your own sales');
    }

    if (sales.some((sale) => sale.cashbackTransactionId)) {
      throw new BadRequestException('Cashback already earned for selected sales');
    }

    if (requestedRedeemedAmount > 0 && sales.some((sale) => sale.cashbackRedeemTransactionId)) {
      throw new BadRequestException('Cashback already redeemed for selected sales');
    }

    const ratePercent = this.getCashbackRatePercent();
    const saleAmount = sales.reduce(
      (sum, sale) => sum + Math.round(Number(sale.quantity || 0) * Number(sale.price || 0)),
      0,
    );

    if (requestedRedeemedAmount > saleAmount) {
      throw new BadRequestException('Redeemed cashback cannot exceed sale total');
    }

    if (requestedRedeemedAmount > cashbackUser.balance) {
      throw new BadRequestException('Insufficient cashback balance');
    }

    const branchId = sales[0]?.branchId ?? null;
    const paymentMethod = sales[0]?.paymentMethod;
    const lineSummary = sales
      .map((sale) => `${sale.product?.name ?? 'Mahsulot'} x ${Number(sale.quantity || 0)}`)
      .join(', ');
    const eligibleAmount = Math.max(0, saleAmount - requestedRedeemedAmount);
    const earnedAmount = Math.floor((eligibleAmount * ratePercent) / 100);

    const result = await this.prisma.$transaction(async (tx) => {
      let currentBalance = cashbackUser.balance;
      let redeemTransactionId: string | null = null;
      let earnTransactionId: string | null = null;

      if (requestedRedeemedAmount > 0) {
        const redeemTransaction = await tx.cashbackTransaction.create({
          data: {
            type: CashbackTransactionType.REDEEM,
            amount: requestedRedeemedAmount,
            saleAmount,
            ratePercent: 0,
            barcode,
            branchId,
            createdById: actorId,
            telegramCashbackUserId: cashbackUser.id,
            note: lineSummary || null,
            redeemedSales: {
              connect: saleIds.map((id) => ({ id })),
            },
          },
        });
        redeemTransactionId = redeemTransaction.id;
        currentBalance -= requestedRedeemedAmount;
      }

      if (earnedAmount > 0) {
        const earnTransaction = await tx.cashbackTransaction.create({
          data: {
            type: CashbackTransactionType.EARN,
            amount: earnedAmount,
            saleAmount: eligibleAmount,
            ratePercent,
            barcode,
            branchId,
            createdById: actorId,
            telegramCashbackUserId: cashbackUser.id,
            note: lineSummary || null,
            earnedSales: {
              connect: saleIds.map((id) => ({ id })),
            },
          },
        });
        earnTransactionId = earnTransaction.id;
        currentBalance += earnedAmount;
      }

      const updatedUser = await tx.telegramCashbackUser.update({
        where: { id: cashbackUser.id },
        data: {
          balance: currentBalance,
        },
      });

      return {
        updatedUser,
        redeemTransactionId,
        earnTransactionId,
      };
    });

    await this.notifyCashbackSettlement({
      telegramId: cashbackUser.telegramId,
      firstName: cashbackUser.firstName,
      redeemedAmount: requestedRedeemedAmount,
      earnedAmount,
      balance: result.updatedUser.balance,
      saleAmount,
      eligibleAmount,
      paymentMethod,
    });

    return {
      ok: true,
      redeemedAmount: requestedRedeemedAmount,
      earnedAmount,
      balance: result.updatedUser.balance,
      ratePercent,
      saleAmount,
      eligibleAmount,
      redeemTransactionId: result.redeemTransactionId,
      earnTransactionId: result.earnTransactionId,
      user: {
        firstName: cashbackUser.firstName,
        lastName: cashbackUser.lastName,
        username: cashbackUser.username,
        barcode: cashbackUser.barcode,
      },
    };
  }

  private async generateUniqueBarcode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = generateCashbackBarcode();
      const exists = await this.prisma.telegramCashbackUser.findUnique({
        where: { barcode: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    throw new BadRequestException('Unable to generate unique barcode');
  }

  private getCashbackRatePercent(): number {
    const raw = Number(process.env.TELEGRAM_CASHBACK_RATE_PERCENT ?? '1');
    if (!Number.isFinite(raw) || raw < 0) return 1;
    return Math.floor(raw);
  }

  private async notifyCashbackSettlement(params: {
    telegramId: string;
    firstName: string;
    redeemedAmount: number;
    earnedAmount: number;
    balance: number;
    saleAmount: number;
    eligibleAmount: number;
    paymentMethod?: PaymentMethod;
  }) {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN is missing, cashback notification skipped');
      return;
    }

    const paymentMethodLabel = mapPaymentMethod(params.paymentMethod);
    const lines = [
      `Assalomu alaykum, ${params.firstName}.`,
      ``,
      `✨ Cashback hisobingiz bo'yicha yangilanish tayyor.`,
      params.redeemedAmount > 0
        ? `➖ Ishlatilgan cashback: ${formatMoney(params.redeemedAmount)} so'm`
        : null,
      params.earnedAmount > 0
        ? `➕ Yangi cashback: ${formatMoney(params.earnedAmount)} so'm`
        : `➕ Yangi cashback: 0 so'm`,
      `💳 Joriy balans: ${formatMoney(params.balance)} so'm`,
      `🧾 Sotuv summasi: ${formatMoney(params.saleAmount)} so'm`,
      params.redeemedAmount > 0
        ? `📌 Cashbackdan keyingi summa: ${formatMoney(params.eligibleAmount)} so'm`
        : null,
      paymentMethodLabel ? `💼 To'lov turi: ${paymentMethodLabel}` : null,
      ``,
      `Ruxshona Tort siz bilan yanada yoqimli.`,
    ].filter(Boolean);

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: params.telegramId,
          text: lines.join('\n'),
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.warn(`Telegram notification failed: ${response.status} ${text}`);
      }
    } catch (error) {
      this.logger.warn(`Telegram notification failed: ${String(error)}`);
    }
  }
}

function generateCashbackBarcode() {
  const body = `27${Math.floor(Math.random() * 10_000_000_000)
    .toString()
    .padStart(10, '0')}`;

  let sum = 0;
  for (let i = 0; i < body.length; i += 1) {
    const digit = Number(body[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return `${body}${checksum}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('uz-UZ').format(Math.max(0, Math.round(value || 0)));
}

function mapPaymentMethod(method?: PaymentMethod) {
  if (method === 'CARD') return 'Karta';
  if (method === 'TRANSFER') return "O'tkazma";
  if (method === 'CASH') return 'Naqd';
  return undefined;
}
