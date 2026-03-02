import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateExpenseItemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salePrice?: number;
}
