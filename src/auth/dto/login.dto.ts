import { IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsOptional()
  @IsString()
  username?: string;

  // Legacy compatibility: some clients send `login` instead of `username`.
  @IsOptional()
  @IsString()
  login?: string;

  @IsString()
  @MinLength(4)
  password: string;
}
