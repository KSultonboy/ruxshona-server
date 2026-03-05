import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { UnitsModule } from './units/units.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module';
import { ExpenseItemsModule } from './expense-items/expense-items.module';
import { ProductsModule } from './products/products.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { BranchesModule } from './branches/branches.module';
import { ShopsModule } from './shops/shops.module';
import { TransfersModule } from './transfers/transfers.module';
import { ReturnsModule } from './returns/returns.module';
import { SalesModule } from './sales/sales.module';
import { StatsModule } from './stats/stats.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AuditModule } from './audit/audit.module';
import { AlertsModule } from './alerts/alerts.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InventoryModule } from './inventory/inventory.module';
import { WagesModule } from './wages/wages.module';
import { OrdersModule } from './orders/orders.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './audit/audit.interceptor';
import { CustomersModule } from './customers/customers.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CustomRequestsModule } from './custom-requests/custom-requests.module';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    ShopsModule,
    UnitsModule,
    ProductCategoriesModule,
    ExpenseCategoriesModule,
    ExpenseItemsModule,
    ProductsModule,
    ExpensesModule,
    WarehouseModule,
    TransfersModule,
    ReturnsModule,
    SalesModule,
    StatsModule,
    PermissionsModule,
    AuditModule,
    AlertsModule,
    PaymentsModule,
    ReportsModule,
    NotificationsModule,
    InventoryModule,
    WagesModule,
    OrdersModule,
    CustomersModule,
    ReviewsModule,
    CustomRequestsModule,
    PostsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
