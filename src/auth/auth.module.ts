import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthGuard } from "./guards/auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { AccessGuard } from "./guards/access.guard";
import { CustomersModule } from "../customers/customers.module";
import { CustomerAuthService } from "./customer-auth.service";
import { CustomerAuthController } from "./customer-auth.controller";
import { CustomerGuard } from "./guards/customer.guard";

@Module({
  imports: [
    PrismaModule,
    CustomersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "dev_secret_change_me",
    }),
  ],
  providers: [AuthService, AuthGuard, RolesGuard, AccessGuard, CustomerAuthService, CustomerGuard],
  controllers: [AuthController, CustomerAuthController],
  exports: [JwtModule, AuthGuard, RolesGuard, AccessGuard, AuthService, CustomerAuthService, CustomerGuard],
})
export class AuthModule { }
