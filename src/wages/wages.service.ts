import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod, StockMovementType } from '@prisma/client';
import { CreateWagePaymentDto } from './dto/create-wage-payment.dto';
import { AuthUser } from '../auth/guards/auth.guard';

@Injectable()
export class WagesService {
    constructor(private prisma: PrismaService) { }

    async getReport(from?: string, to?: string) {
        try {
            const dateFilter: any = {};
            if (from || to) {
                dateFilter.date = {
                    ...(from ? { gte: from } : {}),
                    ...(to ? { lte: to } : {}),
                };
            }

            const movements = await this.prisma.stockMovement.findMany({
                where: {
                    type: StockMovementType.IN,
                    createdById: { not: null },
                    ...dateFilter,
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            labourPrice: true,
                            unit: { select: { name: true, short: true } },
                        },
                    },
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                        },
                    },
                },
                orderBy: { date: 'desc' },
            });

            const payments = await this.prisma.wagePayment.findMany({
                where: dateFilter,
                select: {
                    userId: true,
                    amount: true,
                },
            });

            const usersMap = new Map<string, any>();

            // Calculate Earned
            for (const m of movements) {
                if (!m.createdById || !m.createdBy || !m.product) continue;

                const userId = m.createdById;
                const user = m.createdBy;
                const product = m.product;
                const amount = m.quantity * (product.labourPrice || 0);

                if (!usersMap.has(userId)) {
                    usersMap.set(userId, {
                        user: { id: user.id, name: user.name || user.username },
                        earned: 0,
                        paid: 0,
                        balance: 0,
                        items: [],
                    });
                }

                const entry = usersMap.get(userId);
                entry.earned += amount;
                entry.items.push({
                    id: m.id,
                    date: m.date,
                    productName: product.name,
                    quantity: m.quantity,
                    unit: product.unit?.short || "-",
                    rate: product.labourPrice,
                    total: amount,
                });
            }

            // Calculate Paid
            for (const p of payments) {
                const userId = p.userId;
                if (!usersMap.has(userId)) {
                    continue;
                }
                const entry = usersMap.get(userId);
                entry.paid += p.amount;
            }

            // Calculate Balance
            for (const entry of usersMap.values()) {
                entry.balance = entry.earned - entry.paid;
            }

            return Array.from(usersMap.values());
        } catch (e: any) {
            console.error("Wages Report Error:", e);
            throw e;
        }
    }

    async createPayment(dto: CreateWagePaymentDto, user: AuthUser) {
        return this.prisma.wagePayment.create({
            data: {
                userId: dto.userId,
                amount: dto.amount,
                paymentMethod: dto.paymentMethod,
                date: dto.date || new Date().toISOString().slice(0, 10),
                note: dto.note,
                createdById: user.id ?? user.sub,
            },
        });
    }
}
