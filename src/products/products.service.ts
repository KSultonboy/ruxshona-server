import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ProductType } from "@prisma/client";
import { randomInt } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) { }

    private generateBase12(prefix = "20") {
        let out = prefix;
        while (out.length < 12) {
            out += String(randomInt(0, 10));
        }
        return out.slice(0, 12);
    }

    private computeEan13(base12: string) {
        let odd = 0;
        let even = 0;
        for (let i = 0; i < base12.length; i += 1) {
            const digit = Number(base12[i]);
            if (i % 2 === 0) odd += digit;
            else even += digit;
        }
        const sum = odd + even * 3;
        const check = (10 - (sum % 10)) % 10;
        return `${base12}${check}`;
    }

    private async generateUniqueBarcode() {
        for (let i = 0; i < 8; i += 1) {
            const base = this.generateBase12();
            const barcode = this.computeEan13(base);
            const exists = await this.prisma.product.findUnique({ where: { barcode } });
            if (!exists) return barcode;
        }
        throw new BadRequestException("Barcode generate error");
    }

    async list() {
        const items = await this.prisma.product.findMany({
            orderBy: { createdAt: "desc" },
        });

    const missing = items.filter((p) => !p.barcode || !/^\d{13}$/.test(p.barcode));
        if (missing.length === 0) return items;

        const updated: typeof items = [];
        for (const p of missing) {
            const barcode = await this.generateUniqueBarcode();
            const next = await this.prisma.product.update({
                where: { id: p.id },
                data: { barcode },
            });
            updated.push(next);
        }

        const updateMap = new Map(updated.map((p) => [p.id, p]));
        return items.map((p) => updateMap.get(p.id) ?? p);
    }

    async create(dto: CreateProductDto) {
        try {
            const providedBarcode = dto.barcode?.trim();
            let barcode = providedBarcode;
            if (providedBarcode) {
                const exists = await this.prisma.product.findUnique({ where: { barcode: providedBarcode } });
                if (exists) throw new BadRequestException("Barcode already exists");
            } else {
                barcode = await this.generateUniqueBarcode();
            }
            const type = ProductType.PRODUCT;
            return await this.prisma.product.create({
                data: {
                    name: dto.name.trim(),
                    barcode,
                    type,
                    categoryId: dto.categoryId,
                    unitId: dto.unitId,
                    price: dto.price ?? null,
                    salePrice: dto.salePrice ?? null,
                    shopPrice: dto.shopPrice ?? null,
                    active: dto.active ?? true,
                    labourPrice: dto.labourPrice ?? 0,
                    images: dto.images?.slice(0, 3) ?? [],
                },
            });
        } catch (e: any) {
            throw new BadRequestException("Product create error (check category/unit IDs)");
        }
    }

    async update(id: string, dto: UpdateProductDto) {
        const exists = await this.prisma.product.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException("Product not found");

        try {
            const { images, price, salePrice, shopPrice, ...rest } = dto;
            const data: Record<string, any> = {
                ...rest,
                name: dto.name ? dto.name.trim() : undefined,
            };

            if (price !== undefined) data.price = price ?? null;
            if (salePrice !== undefined) data.salePrice = salePrice ?? null;
            if (shopPrice !== undefined) data.shopPrice = shopPrice ?? null;
            if (dto.labourPrice !== undefined) data.labourPrice = dto.labourPrice;

            if (images !== undefined) {
                data.images = images.slice(0, 3);
            }

            await this.prisma.product.update({
                where: { id },
                data,
            });
            return { ok: true };
        } catch {
            throw new BadRequestException("Product update error");
        }
    }

    async remove(id: string) {
        const exists = await this.prisma.product.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException("Product not found");
        try {
            await this.prisma.$transaction(async (tx) => {
                await tx.stockMovement.deleteMany({ where: { productId: id } });
                await tx.product.delete({ where: { id } });
            });
            return { ok: true };
        } catch (e: any) {
            if (e?.code === "P2003") {
                throw new BadRequestException("Product is in use (stock movements).");
            }
            throw e;
        }
    }

    async addImages(id: string, files: Express.Multer.File[]) {
        const product = await this.prisma.product.findUnique({ where: { id } });
        if (!product) throw new NotFoundException("Product not found");

        const existing = product.images ?? [];
        const newUrls = files.map((file) => `/uploads/products/${file.filename}`);
        const combined = [...existing, ...newUrls].slice(0, 3);

        await this.prisma.product.update({
            where: { id },
            data: { images: combined },
        });

        return { ok: true, images: combined };
    }
}
