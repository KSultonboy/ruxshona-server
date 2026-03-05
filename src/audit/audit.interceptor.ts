import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import { AuditService } from './audit.service';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SKIP_PATH_PREFIXES = ['/health', '/auth/login', '/auth/refresh'];
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'refreshToken',
  'token',
]);

function sanitize(value: any): any {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  const next: Record<string, any> = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key)) continue;
    next[key] = sanitize(val);
  }
  return next;
}

function extractEntity(path: string) {
  const clean = path.split('?')[0];
  const parts = clean.split('/').filter(Boolean);
  return parts[0] ?? 'root';
}

function extractEntityIdFromResult(result: any) {
  if (!result || typeof result !== 'object') return null;
  if (Array.isArray(result)) return null;
  const direct = result.id;
  if (typeof direct === 'string') return direct;
  const nested = result.data?.id;
  if (typeof nested === 'string') return nested;
  return null;
}

function summarizeResult(result: any) {
  if (!result) return undefined;
  if (Array.isArray(result)) return { count: result.length };
  if (typeof result !== 'object') return { value: result };
  if (typeof result.id === 'string') return { id: result.id };
  if (typeof result.ok === 'boolean') return { ok: result.ok };
  if (typeof result.count === 'number') return { count: result.count };
  return undefined;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method.toUpperCase();
    const path = req.originalUrl ?? req.url;

    if (!WRITE_METHODS.has(method)) {
      return next.handle();
    }

    if (SKIP_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return next.handle();
    }

    const entity = extractEntity(path);
    const entityId = (req.params as any)?.id ?? null;
    const user = (req as any).user;
    const meta = {
      params: sanitize(req.params),
      query: sanitize(req.query),
      body: sanitize((req as any).body),
    };

    const action =
      method === 'POST' ? 'create' : method === 'DELETE' ? 'delete' : 'update';

    return next.handle().pipe(
      tap((result) => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response?.statusCode;
        const resultId = extractEntityIdFromResult(result);
        const summary = summarizeResult(result);
        void this.audit.create({
          action,
          entity,
          entityId: resultId ?? entityId,
          method,
          path,
          userId: user?.id ?? user?.sub ?? null,
          userRole: user?.role ?? null,
          meta: {
            ...meta,
            statusCode,
            result: summary ? sanitize(summary) : undefined,
          },
        });
      }),
    );
  }
}
