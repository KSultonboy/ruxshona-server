import {
  IsArray,
  IsEnum,
  IsNumber,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';

class UpdateSaleGroupItemDto {
  @IsString()
  barcode: string;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 3, allowInfinity: false, allowNaN: false },
    { message: 'quantity must be a valid number with up to 3 decimal places' },
  )
  @Min(0.001)
  quantity: number;
}

export class UpdateSaleGroupDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSaleGroupItemDto)
  items: UpdateSaleGroupItemDto[];

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;
}
