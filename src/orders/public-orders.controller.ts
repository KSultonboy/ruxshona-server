import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreatePublicOrderDto } from './dto/create-public-order.dto';

@Controller('public')
export class PublicOrdersController {
  constructor(private service: OrdersService) {}

  @Get('categories')
  listCategories() {
    return this.service.listPublicCategories();
  }

  @Get('products')
  listProducts(
    @Query('categoryId') categoryId?: string,
    @Query('q') q?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    return this.service.listPublicProducts({
      categoryId,
      q,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
    });
  }

  @Post('orders')
  create(@Body() dto: CreatePublicOrderDto) {
    return this.service.createPublic(dto);
  }
}
