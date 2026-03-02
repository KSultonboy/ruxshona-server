import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { ExpenseCategoryType } from "@prisma/client";

export class CreateExpenseCategoryDto {
    @IsString()
    @MinLength(1)
    name: string;

    @IsOptional()
    @IsEnum(ExpenseCategoryType)
    type?: ExpenseCategoryType;

    @IsOptional()
    @IsString()
    productCategoryId?: string;
}
