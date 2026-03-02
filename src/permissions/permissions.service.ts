import { Injectable } from "@nestjs/common";
import { Permission } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export const PERMISSION_GROUPS: { group: string; permissions: Permission[] }[] = [
  { group: "Users", permissions: [Permission.USERS_READ, Permission.USERS_WRITE] },
  { group: "Branches", permissions: [Permission.BRANCHES_READ, Permission.BRANCHES_WRITE] },
  { group: "Shops", permissions: [Permission.SHOPS_READ, Permission.SHOPS_WRITE] },
  { group: "Products", permissions: [Permission.PRODUCTS_READ, Permission.PRODUCTS_WRITE] },
  { group: "Expenses", permissions: [Permission.EXPENSES_READ, Permission.EXPENSES_WRITE] },
  { group: "Warehouse", permissions: [Permission.WAREHOUSE_READ, Permission.WAREHOUSE_WRITE] },
  {
    group: "Transfers",
    permissions: [Permission.TRANSFERS_READ, Permission.TRANSFERS_WRITE, Permission.TRANSFERS_RECEIVE],
  },
  {
    group: "Returns",
    permissions: [Permission.RETURNS_READ, Permission.RETURNS_WRITE, Permission.RETURNS_APPROVE],
  },
  { group: "Sales", permissions: [Permission.SALES_READ, Permission.SALES_WRITE] },
  { group: "Payments", permissions: [Permission.PAYMENTS_READ, Permission.PAYMENTS_WRITE] },
  { group: "Reports", permissions: [Permission.REPORTS_READ] },
  { group: "Alerts", permissions: [Permission.ALERTS_READ, Permission.ALERTS_WRITE] },
  { group: "Audit", permissions: [Permission.AUDIT_READ] },
];

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  definitions() {
    return PERMISSION_GROUPS;
  }

  listByUser(userId: string) {
    return this.prisma.userPermission.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  listAll() {
    return this.prisma.userPermission.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, username: true } }, branch: { select: { id: true, name: true } } },
    });
  }

  async replaceForUser(userId: string, permissions: { permission: Permission; branchId?: string | null }[]) {
    await this.prisma.userPermission.deleteMany({ where: { userId } });
    if (!permissions.length) return { ok: true };

    await this.prisma.userPermission.createMany({
      data: permissions.map((p) => ({
        userId,
        permission: p.permission,
        branchId: p.branchId ?? null,
      })),
    });
    return { ok: true };
  }
}
