import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreatePublicOrderItemDto {
  @IsString()
  productId: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;
}

export class CreatePublicOrderDto {
  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsNumber()
  pointsToUse?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePublicOrderItemDto)
  items: CreatePublicOrderItemDto[];
}
