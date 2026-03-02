import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateAlertRuleDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  threshold?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
