import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ProductCategoriesService } from "./product-categories.service";
import { CreateProductCategoryDto } from "./dto/create-product-category.dto";
import { UpdateProductCategoryDto } from "./dto/update-product-category.dto";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AccessGuard } from "../auth/guards/access.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { Permission } from "@prisma/client";

@Controller("product-categories")
@UseGuards(AuthGuard, AccessGuard)
@Roles("ADMIN")
export class ProductCategoriesController {
    constructor(private service: ProductCategoriesService) { }

    @Get()
    @Permissions(Permission.PRODUCTS_READ)
    list() {
        return this.service.list();
    }

    @Post()
    @Permissions(Permission.PRODUCTS_WRITE)
    create(@Body() dto: CreateProductCategoryDto) {
        return this.service.create(dto);
    }

    @Patch(":id")
    @Permissions(Permission.PRODUCTS_WRITE)
    update(@Param("id") id: string, @Body() dto: UpdateProductCategoryDto) {
        return this.service.update(id, dto);
    }

    @Delete(":id")
    @Permissions(Permission.PRODUCTS_WRITE)
    remove(@Param("id") id: string) {
        return this.service.remove(id);
    }
}
