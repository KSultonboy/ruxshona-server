import { Injectable, OnModuleInit, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { JwtSignOptions } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { randomBytes, createHash } from "crypto";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const ACCESS_TOKEN_TTL: JwtSignOptions["expiresIn"] =
  (process.env.ACCESS_TOKEN_TTL ?? "30m") as JwtSignOptions["expiresIn"];
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? "15");

type SafeUser = { id: string; username: string; role: UserRole; active: boolean; branchId?: string | null };

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async onModuleInit() {
    await this.ensureAdminUser();
  }

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.active) throw new UnauthorizedException("Invalid credentials");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    const access = this.createAccessToken(user);
    const refresh = await this.issueRefreshToken(user.id);

    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt,
      user: this.safeUser(user),
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (!existing.user.active) {
      throw new UnauthorizedException("User disabled");
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const access = this.createAccessToken(existing.user);
    const refresh = await this.issueRefreshToken(existing.userId);

    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt,
      user: this.safeUser(existing.user),
    };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!existing) return { ok: true };
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found");
    return this.safeUser(user);
  }

  async permissions(userId: string) {
    return this.prisma.userPermission.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });
  }

  private createAccessToken(user: { id: string; username: string; role: UserRole }) {
    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = this.jwt.sign(payload, { expiresIn: ACCESS_TOKEN_TTL });
    const expiresAt = this.jwt.decode(token)?.exp
      ? new Date((this.jwt.decode(token) as any).exp * 1000).toISOString()
      : null;
    return { token, expiresAt };
  }

  private async issueRefreshToken(userId: string) {
    const token = randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt,
      },
    });

    return { token, expiresAt: expiresAt.toISOString() };
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private safeUser(user: SafeUser) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      active: user.active,
      branchId: user.branchId ?? null,
    };
  }

  private async ensureAdminUser() {
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;
    if (!username || !password) return;

    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) return;

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.create({
      data: {
        username,
        passwordHash,
        role: "ADMIN",
        active: true,
      },
    });
  }
}
