import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryCheckDto } from './dto/create-inventory.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AccessGuard } from '../auth/guards/access.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@prisma/client';

@Controller('inventory')
@UseGuards(AuthGuard, AccessGuard)
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Post()
    @Permissions(Permission.WAREHOUSE_WRITE)
    create(@Req() req: any, @Body() createInventoryCheckDto: CreateInventoryCheckDto) {
        return this.inventoryService.create(req.user.id, createInventoryCheckDto);
    }

    @Get()
    @Permissions(Permission.WAREHOUSE_READ)
    findAll() {
        return this.inventoryService.findAll();
    }

    @Get(':id')
    @Permissions(Permission.WAREHOUSE_READ)
    findOne(@Param('id') id: string) {
        return this.inventoryService.findOne(id);
    }

    @Post(':id/finalize')
    @Permissions(Permission.WAREHOUSE_WRITE)
    finalize(@Param('id') id: string) {
        return this.inventoryService.finalize(id);
    }

    @Delete(':id')
    @Permissions(Permission.WAREHOUSE_WRITE)
    remove(@Param('id') id: string) {
        return this.inventoryService.remove(id);
    }
}
