import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomRequestDto } from './dto/create-custom-request.dto';
import { CustomRequestStatus } from '@prisma/client';

@Injectable()
export class CustomRequestsService {
    constructor(private prisma: PrismaService) { }

    async create(customerId: string, dto: CreateCustomRequestDto) {
        return this.prisma.customRequest.create({
            data: {
                ...dto,
                customerId,
                status: CustomRequestStatus.PENDING,
            },
        });
    }

    async findByCustomer(customerId: string) {
        return this.prisma.customRequest.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findAll() {
        return this.prisma.customRequest.findMany({
            include: {
                customer: {
                    select: {
                        name: true,
                        phone: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        return this.prisma.customRequest.findUnique({
            where: { id },
            include: {
                customer: {
                    select: {
                        name: true,
                        phone: true,
                    },
                },
            },
        });
    }

    async updateStatus(id: string, status: CustomRequestStatus, priceQuote?: number, adminNote?: string) {
        return this.prisma.customRequest.update({
            where: { id },
            data: {
                status,
                priceQuote,
                adminNote,
            },
        });
    }
}
