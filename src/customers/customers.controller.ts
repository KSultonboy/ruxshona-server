import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { CustomerGuard } from "../auth/guards/customer.guard";
import { CustomersService } from "./customers.service";

@Controller("customers")
export class CustomersController {
    constructor(private customersService: CustomersService) { }

    @UseGuards(CustomerGuard)
    @Get("orders")
    getOrders(@Req() req: any) {
        return this.customersService.getCustomerOrders(req.customer.id);
    }

    @UseGuards(CustomerGuard)
    @Get("messages")
    getMessages(@Req() req: any) {
        return this.customersService.getCustomerMessages(req.customer.id);
    }
}
