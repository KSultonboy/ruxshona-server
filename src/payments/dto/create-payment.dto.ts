import { IsEnum, IsInt, IsOptional, IsString, Matches, Min } from "class-validator";
import { PaymentMethod, PaymentSourceType } from "@prisma/client";

export class CreatePaymentDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsEnum(PaymentSourceType)
  sourceType: PaymentSourceType;

  @IsString()
  sourceId: string;

  @IsInt()
  @Min(1)
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  note?: string;
}
