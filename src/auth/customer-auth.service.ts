import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { CustomersService } from "../customers/customers.service";
import { LoginCustomerDto } from "../customers/dto/login-customer.dto";
import bcrypt from "bcryptjs";

@Injectable()
export class CustomerAuthService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
        private customersService: CustomersService,
    ) { }

    async login(dto: LoginCustomerDto) {
        const customer = await this.customersService.findByPhone(dto.phone);
        if (!customer || !customer.active) {
            throw new UnauthorizedException("Invalid phone or password");
        }

        const isOk = await bcrypt.compare(dto.password, customer.passwordHash);
        if (!isOk) {
            throw new UnauthorizedException("Invalid phone or password");
        }

        const payload = {
            sub: customer.id,
            phone: customer.phone,
            type: "customer"
        };

        const token = this.jwt.sign(payload, { expiresIn: "7d" });

        return {
            token,
            customer: {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
                birthday: customer.birthday,
                points: customer.points,
                active: customer.active,
                createdAt: customer.createdAt,
                updatedAt: customer.updatedAt,
            }
        };
    }

    async validateCustomer(id: string) {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
            select: {
                id: true,
                active: true,
                phone: true,
            },
        });
        if (!customer || !customer.active) return null;
        return customer;
    }
}
