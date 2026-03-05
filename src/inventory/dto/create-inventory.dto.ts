import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class InventoryCheckItemDto {
  @IsString()
  productId: string;

  @IsInt()
  actualQuantity: number;
}

export class CreateInventoryCheckDto {
  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryCheckItemDto)
  items: InventoryCheckItemDto[];
}
