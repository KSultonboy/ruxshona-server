import { IsOptional, IsString } from 'class-validator';

export class PushTestDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;
}
