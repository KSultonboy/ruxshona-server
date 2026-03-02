import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Matches, Min, ValidateNested } from "class-validator";
import { ReturnSourceType } from "@prisma/client";

export class ReturnItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateReturnDto {
  @IsEnum(ReturnSourceType)
  sourceType: ReturnSourceType;

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
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}
