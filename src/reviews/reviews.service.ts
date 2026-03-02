import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
    constructor(private prisma: PrismaService) { }

    async create(customerId: string, dto: CreateReviewDto) {
        const product = await this.prisma.product.findUnique({
            where: { id: dto.productId },
            select: { id: true },
        });
        if (!product) throw new NotFoundException('Mahsulot topilmadi');

        return this.prisma.review.create({
            data: {
                ...dto,
                customerId,
            },
            include: {
                customer: {
                    select: {
                        name: true,
                    },
                },
            },
        });
    }

    async findByProduct(productId: string) {
        return this.prisma.review.findMany({
            where: { productId },
            include: {
                customer: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
}
