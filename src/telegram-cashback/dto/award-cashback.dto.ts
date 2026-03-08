import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class AwardCashbackDto {
  @IsString()
  barcode: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  saleIds: string[];
}
