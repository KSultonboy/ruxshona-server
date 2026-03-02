import { Module } from "@nestjs/common";
import { ExpenseCategoriesController } from "./expense-categories.controller";
import { ExpenseCategoriesService } from "./expense-categories.service";
import { AuthModule } from "../auth/auth.module";

@Module({
    imports: [AuthModule],
    controllers: [ExpenseCategoriesController],
    providers: [ExpenseCategoriesService],
})
export class ExpenseCategoriesModule { }
