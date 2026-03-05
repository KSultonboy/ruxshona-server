import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@prisma/client';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
