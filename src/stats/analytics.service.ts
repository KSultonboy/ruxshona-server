import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OrderStatus } from "@prisma/client";

@Injectable()
export class AnalyticsService {
    constructor(private prisma: PrismaService) { }

    async getMarketingStats() {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        const [
            totalOrders,
            totalSales,
            newCustomers,
            topProducts,
            couponStats,
            newOrders,
            inDeliveryOrders,
            deliveredOrders,
            canceledOrders,
            recentOrders
        ] = await Promise.all([
            // Total Website Orders
            this.prisma.order.count({
                where: { source: "WEBSITE" }
            }),
            // Total Website Sales (Completed)
            this.prisma.order.aggregate({
                where: { source: "WEBSITE", status: OrderStatus.DELIVERED },
                _sum: { total: true }
            }),
            // New Customers (Last 30 days)
            this.prisma.customer.count({
                where: { createdAt: { gte: thirtyDaysAgo } }
            }),
            // Top 5 Products by Quantity
            this.prisma.orderItem.groupBy({
                by: ['productId'],
                _sum: { quantity: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 5,
                where: { order: { source: "WEBSITE" } }
            }),
            // Coupon usage
            this.prisma.coupon.findMany({
                select: {
                    code: true,
                    usedCount: true,
                    discount: true
                },
                orderBy: { usedCount: 'desc' },
                take: 10
            }),
            this.prisma.order.count({
                where: { source: "WEBSITE", status: OrderStatus.NEW }
            }),
            this.prisma.order.count({
                where: { source: "WEBSITE", status: OrderStatus.IN_DELIVERY }
            }),
            this.prisma.order.count({
                where: { source: "WEBSITE", status: OrderStatus.DELIVERED }
            }),
            this.prisma.order.count({
                where: { source: "WEBSITE", status: OrderStatus.CANCELED }
            }),
            this.prisma.order.count({
                where: {
                    source: "WEBSITE",
                    createdAt: { gte: sevenDaysAgo }
                }
            })
        ]);

        // Enrich top products with names
        const enrichedProducts = await Promise.all(
            topProducts.map(async (p) => {
                const product = await this.prisma.product.findUnique({
                    where: { id: p.productId as string },
                    select: { name: true }
                });
                return {
                    name: product?.name || 'Unknown',
                    quantity: p._sum.quantity
                };
            })
        );

        return {
            totalOrders,
            totalSales: totalSales._sum.total || 0,
            newCustomers,
            newOrders,
            inDeliveryOrders,
            deliveredOrders,
            canceledOrders,
            recentOrders,
            topProducts: enrichedProducts,
            couponStats
        };
    }
}
