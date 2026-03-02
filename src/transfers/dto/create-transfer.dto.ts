import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Matches, Min, ValidateNested } from "class-validator";
import { TransferTargetType } from "@prisma/client";

export class TransferItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateTransferDto {
  @IsEnum(TransferTargetType)
  targetType: TransferTargetType;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];
}
