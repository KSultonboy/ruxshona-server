import { Module } from '@nestjs/common';
import { CustomRequestsService } from './custom-requests.service';
import { CustomRequestsController } from './custom-requests.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [CustomRequestsController],
    providers: [CustomRequestsService],
    exports: [CustomRequestsService],
})
export class CustomRequestsModule { }
