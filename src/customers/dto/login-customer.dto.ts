import { IsNotEmpty, IsString } from 'class-validator';

export class LoginCustomerDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
