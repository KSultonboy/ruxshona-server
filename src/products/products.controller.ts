import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AccessGuard } from "../auth/guards/access.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { Permission } from "@prisma/client";
import { FilesInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";

@Controller("products")
@UseGuards(AuthGuard, AccessGuard)
@Roles("ADMIN", "PRODUCTION")
export class ProductsController {
    constructor(private service: ProductsService) { }

    @Get()
    @Permissions(Permission.PRODUCTS_READ)
    list() {
        return this.service.list();
    }

    @Post()
    @Permissions(Permission.PRODUCTS_WRITE)
    create(@Body() dto: CreateProductDto) {
        return this.service.create(dto);
    }

    @Patch(":id")
    @Permissions(Permission.PRODUCTS_WRITE)
    update(@Param("id") id: string, @Body() dto: UpdateProductDto) {
        return this.service.update(id, dto);
    }

    @Delete(":id")
    @Permissions(Permission.PRODUCTS_WRITE)
    remove(@Param("id") id: string) {
        return this.service.remove(id);
    }

    @Post(":id/images")
    @Permissions(Permission.PRODUCTS_WRITE)
    @UseInterceptors(
        FilesInterceptor("images", 3, {
            storage: diskStorage({
                destination: join(process.cwd(), "uploads", "products"),
                filename: (_req, file, cb) => {
                    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                    const ext = extname(file.originalname || "").toLowerCase() || ".jpg";
                    cb(null, `${unique}${ext}`);
                },
            }),
        })
    )
    uploadImages(@Param("id") id: string, @UploadedFiles() files: Express.Multer.File[]) {
        return this.service.addImages(id, files ?? []);
    }
}
