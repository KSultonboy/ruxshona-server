import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateSaleDto {
  @IsString()
  barcode: string;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 3, allowInfinity: false, allowNaN: false },
    { message: 'quantity must be a valid number with up to 3 decimal places' },
  )
  @Min(0.001)
  quantity: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string; // YYYY-MM-DD
}
