import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PublicPostsController } from './public-posts.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublicPostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
