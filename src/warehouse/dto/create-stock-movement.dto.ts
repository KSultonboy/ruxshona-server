import { StockMovementType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStockMovementDto {
  @IsString()
  productId!: string;

  @IsEnum(StockMovementType)
  type!: StockMovementType;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 3, allowInfinity: false, allowNaN: false },
    { message: 'quantity must be a valid number with up to 3 decimal places' },
  )
  @Min(0.001)
  @Max(1000000)
  quantity!: number;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @IsOptional()
  @IsString()
  createdById?: string;
}
