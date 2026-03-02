import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RetentionService {
    private readonly logger = new Logger(RetentionService.name);

    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_9AM)
    async handleBirthdayCoupons() {
        this.logger.log('Running birthday coupons generator...');

        // Get today's month and day in MM-DD format
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const searchStr = `-${month}-${day}`;

        // Find customers whose birthday ends with -MM-DD
        const customers = await this.prisma.customer.findMany({
            where: {
                birthday: {
                    endsWith: searchStr,
                },
                active: true,
            },
        });

        this.logger.log(`Found ${customers.length} customers with birthday today.`);

        for (const customer of customers) {
            try {
                const code = `BDAY-${customer.name.slice(0, 3).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
                const discount = 50000; // 50,000 so'm discount
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

                await this.prisma.coupon.create({
                    data: {
                        code,
                        discount,
                        isPercent: false,
                        minOrder: 150000, // Minimal order 150,000 so'm
                        maxUses: 1,
                        expiresAt,
                        active: true,
                    },
                });

                await this.notifications.notifyBirthdayCoupon(customer.phone, code, discount);
                this.logger.log(`Birthday coupon generated and notified for ${customer.name} (${customer.phone})`);
            } catch (e) {
                this.logger.error(`Failed to generate birthday coupon for ${customer.name}: ${e.message}`);
            }
        }
    }
}
