import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  birthday?: string;
}
