import { IsEnum, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateWagePaymentDto {
    @IsString()
    userId!: string;

    @IsInt()
    @Min(1)
    amount!: number;

    @IsEnum(PaymentMethod)
    paymentMethod!: PaymentMethod;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    date?: string;

    @IsOptional()
    @IsString()
    note?: string;
}
