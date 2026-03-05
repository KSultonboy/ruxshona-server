import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
import { RegisterCustomerDto } from '../customers/dto/register-customer.dto';
import { LoginCustomerDto } from '../customers/dto/login-customer.dto';
import { CustomersService } from '../customers/customers.service';
import { CustomerGuard } from './guards/customer.guard';
import { UpdateCustomerProfileDto } from '../customers/dto/update-customer-profile.dto';

@Controller('customer-auth')
export class CustomerAuthController {
  constructor(
    private auth: CustomerAuthService,
    private customers: CustomersService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterCustomerDto) {
    return this.customers.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginCustomerDto) {
    return this.auth.login(dto);
  }

  @UseGuards(CustomerGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.customers.findById(req.customer.id);
  }

  @UseGuards(CustomerGuard)
  @Patch('me')
  updateMe(@Req() req: any, @Body() dto: UpdateCustomerProfileDto) {
    return this.customers.updateProfile(req.customer.id, dto);
  }
}
