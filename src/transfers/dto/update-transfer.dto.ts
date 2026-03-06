import { PartialType } from '@nestjs/mapped-types';
import { CreateTransferDto } from './create-transfer.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTransferDto extends PartialType(CreateTransferDto) {
  @IsOptional()
  @IsString()
  specialCode?: string;
}
