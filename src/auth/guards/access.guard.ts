import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { Permission, UserRole } from '@prisma/client';

function readString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function extractBranchId(req: Request) {
  const body = (req as any).body ?? {};
  const query = (req as any).query ?? {};
  const params = (req as any).params ?? {};

  return (
    readString(body.branchId) ??
    readString(query.branchId) ??
    readString(params.branchId) ??
    (body.sourceType === 'BRANCH' ? readString(body.sourceId) : undefined) ??
    ((req.path?.startsWith('/branches/') && readString(params.id)) || undefined)
  );
}

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const permissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (
      (!roles || roles.length === 0) &&
      (!permissions || permissions.length === 0)
    )
      return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as any).user;
    if (!user) throw new ForbiddenException('Forbidden');

    if (user.role === 'ADMIN') return true;

    if (permissions && permissions.length > 0) {
      const userId = user.id ?? user.sub;
      const hasAnyPermission = await this.prisma.userPermission.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (hasAnyPermission) {
        const branchId = extractBranchId(req);
        const candidateBranchIds = new Set<string>();
        if (branchId) candidateBranchIds.add(branchId);

        if (!branchId) {
          const userRecord = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { branchId: true },
          });
          if (userRecord?.branchId) candidateBranchIds.add(userRecord.branchId);
        }

        const branchIds = Array.from(candidateBranchIds);
        const branchConditions: Array<
          { branchId: string | null } | { branchId: { in: string[] } }
        > = [{ branchId: null }];
        if (branchIds.length)
          branchConditions.push({ branchId: { in: branchIds } });

        const match = await this.prisma.userPermission.findFirst({
          where: {
            userId,
            permission: { in: permissions },
            OR: branchConditions,
          },
        });

        if (!match) {
          // Fallback to role-based access when endpoint explicitly allows this role.
          // This keeps mobile flows working even if granular permissions are not assigned yet.
          if (roles && roles.length > 0 && roles.includes(user.role)) {
            return true;
          }
          throw new ForbiddenException('Forbidden');
        }
        return true;
      }
    }

    if (roles && roles.length > 0 && roles.includes(user.role)) return true;

    if (permissions && permissions.length > 0) {
      throw new ForbiddenException('Forbidden');
    }

    return false;
  }
}
