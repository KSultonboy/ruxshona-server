import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export type AuthUser = {
  sub: string;
  username: string;
  role: string;
  id?: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = auth.slice('Bearer '.length);
    try {
      const payload = this.jwt.verify(token);
      (req as any).user = {
        ...(payload as AuthUser),
        id: payload.sub,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
