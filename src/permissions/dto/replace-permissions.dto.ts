import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { Permission } from "@prisma/client";

class PermissionItemDto {
  @IsEnum(Permission)
  permission: Permission;

  @IsOptional()
  @IsString()
  branchId?: string | null;
}

export class ReplacePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionItemDto)
  permissions: PermissionItemDto[];
}
