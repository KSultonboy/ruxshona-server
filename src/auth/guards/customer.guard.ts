import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class CustomerGuard implements CanActivate {
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
      if (payload.type !== 'customer') {
        throw new UnauthorizedException('Invalid user type');
      }
      const customer = { id: payload.sub, phone: payload.phone };
      (req as any).customer = customer;
      // Keep req.user aligned for older customer controllers that still read req.user.
      (req as any).user = customer;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
