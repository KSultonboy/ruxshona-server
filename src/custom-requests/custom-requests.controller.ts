import { Body, Controller, Get, Param, Patch, Post, UseGuards, Request } from '@nestjs/common';
import { CustomRequestsService } from './custom-requests.service';
import { CreateCustomRequestDto } from './dto/create-custom-request.dto';
import { CustomerGuard } from '../auth/guards/customer.guard';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CustomRequestStatus } from '@prisma/client';

@Controller('custom-requests')
export class CustomRequestsController {
    constructor(private readonly customRequestsService: CustomRequestsService) { }

    // Customer endpoints
    @Post()
    @UseGuards(CustomerGuard)
    create(@Request() req, @Body() dto: CreateCustomRequestDto) {
        return this.customRequestsService.create(req.user.id, dto);
    }

    @Get('my')
    @UseGuards(CustomerGuard)
    findMy(@Request() req) {
        return this.customRequestsService.findByCustomer(req.user.id);
    }

    // Admin endpoints (ERP)
    @Get()
    @UseGuards(AuthGuard)
    findAll() {
        return this.customRequestsService.findAll();
    }

    @Get(':id')
    @UseGuards(AuthGuard)
    findOne(@Param('id') id: string) {
        return this.customRequestsService.findOne(id);
    }

    @Patch(':id/status')
    @UseGuards(AuthGuard)
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: CustomRequestStatus,
        @Body('priceQuote') priceQuote?: number,
        @Body('adminNote') adminNote?: string
    ) {
        return this.customRequestsService.updateStatus(id, status, priceQuote, adminNote);
    }
}
