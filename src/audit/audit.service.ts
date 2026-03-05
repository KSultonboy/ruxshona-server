import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AuditCreateInput = {
  action: string;
  entity: string;
  entityId?: string | null;
  method: string;
  path: string;
  userId?: string | null;
  userRole?: string | null;
  meta?: any;
};

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async create(input: AuditCreateInput) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: input.action,
          entity: input.entity,
          entityId: input.entityId ?? null,
          method: input.method,
          path: input.path,
          userId: input.userId ?? null,
          userRole: input.userRole ? (input.userRole as any) : null,
          meta: input.meta ?? undefined,
        },
      });
    } catch {
      // Audit should not block business flow.
    }
  }

  async list(filters: {
    from?: string;
    to?: string;
    entity?: string;
    userId?: string;
    action?: string;
    skip?: number;
    take?: number;
  }) {
    const where: any = {};
    if (filters.entity) where.entity = filters.entity;
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, role: true } } },
        skip: filters.skip ?? 0,
        take: filters.take ?? 50,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }

  async remove(id: string) {
    return this.prisma.auditLog.delete({ where: { id } });
  }

  async update(id: string, data: any) {
    return this.prisma.auditLog.update({
      where: { id },
      data: { meta: data },
    });
  }
}
