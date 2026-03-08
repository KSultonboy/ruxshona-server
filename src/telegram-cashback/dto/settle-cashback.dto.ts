import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SettleCashbackDto {
  @IsString()
  barcode: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  saleIds: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  redeemedAmount?: number;
}
