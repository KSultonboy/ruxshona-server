import { IsOptional, IsString } from 'class-validator';

export class SyncTelegramCashbackUserDto {
  @IsString()
  telegramId: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}
