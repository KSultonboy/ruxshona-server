import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { WagesService } from "./wages.service";
import { AuthGuard, type AuthUser } from "../auth/guards/auth.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "@prisma/client";
import { CreateWagePaymentDto } from "./dto/create-wage-payment.dto";
import { User } from "../auth/decorators/user.decorator";

@Controller("wages")
@UseGuards(AuthGuard)
export class WagesController {
    constructor(private service: WagesService) { }

    @Get("report")
    @Roles("ADMIN")
    getReport(@Query("from") from?: string, @Query("to") to?: string) {
        return this.service.getReport(from, to);
    }

    @Post("payments")
    @Roles("ADMIN")
    createPayment(@Body() dto: CreateWagePaymentDto, @User() user: AuthUser) {
        return this.service.createPayment(dto, user);
    }
}
