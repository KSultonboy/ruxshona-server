import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { AlertRuleType } from "@prisma/client";

export class CreateAlertRuleDto {
  @IsEnum(AlertRuleType)
  type: AlertRuleType;

  @IsInt()
  @Min(0)
  threshold: number;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
