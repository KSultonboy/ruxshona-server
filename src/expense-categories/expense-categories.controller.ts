import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ExpenseCategoriesService } from "./expense-categories.service";
import { CreateExpenseCategoryDto } from "./dto/create-expense-category.dto";
import { UpdateExpenseCategoryDto } from "./dto/update-expense-category.dto";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AccessGuard } from "../auth/guards/access.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { Permission } from "@prisma/client";

@Controller("expense-categories")
@UseGuards(AuthGuard, AccessGuard)
@Roles("ADMIN")
export class ExpenseCategoriesController {
    constructor(private service: ExpenseCategoriesService) { }

    @Get()
    @Permissions(Permission.EXPENSES_READ)
    list() {
        return this.service.list();
    }

    @Post()
    @Permissions(Permission.EXPENSES_WRITE)
    create(@Body() dto: CreateExpenseCategoryDto) {
        return this.service.create(dto);
    }

    @Patch(":id")
    @Permissions(Permission.EXPENSES_WRITE)
    update(@Param("id") id: string, @Body() dto: UpdateExpenseCategoryDto) {
        return this.service.update(id, dto);
    }

    @Delete(":id")
    @Permissions(Permission.EXPENSES_WRITE)
    remove(@Param("id") id: string) {
        return this.service.remove(id);
    }
}
