import { IsOptional, IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @IsOptional()
  @IsString()
  @MinLength(10)
  refreshToken?: string;

  // Legacy compatibility: some clients send `refresh`.
  @IsOptional()
  @IsString()
  @MinLength(10)
  refresh?: string;

  // Legacy compatibility: some clients send `token` as refresh payload.
  @IsOptional()
  @IsString()
  @MinLength(10)
  token?: string;
}
