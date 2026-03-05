import { IsString, IsArray, IsOptional, IsDateString } from 'class-validator';

export class CreateCustomRequestDto {
  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  referenceImages?: string[];

  @IsDateString()
  desiredDate: string;
}
