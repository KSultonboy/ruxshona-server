import { Controller, Get, Param } from "@nestjs/common";
import { PostsService } from "./posts.service";

@Controller("public/posts")
export class PublicPostsController {
    constructor(private readonly service: PostsService) { }

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Get(":slug")
    findOne(@Param("slug") slug: string) {
        return this.service.findBySlug(slug);
    }
}
