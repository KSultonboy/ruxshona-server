import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createServer } from 'net';

async function isPortAvailable(port: number, host: string) {
  return new Promise<boolean>((resolve) => {
    const tester = createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.close(() => resolve(true));
      });

    tester.listen(port, host);
  });
}

async function pickAvailablePort(
  preferredPort: number,
  host: string,
  maxOffset = 20,
) {
  for (let offset = 0; offset <= maxOffset; offset += 1) {
    const nextPort = preferredPort + offset;
    if (await isPortAvailable(nextPort, host)) {
      return nextPort;
    }
  }

  throw new Error(
    `No available port in range ${preferredPort}-${preferredPort + maxOffset}`,
  );
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // API prefix
  app.setGlobalPrefix('api');

  const tauriOrigins = [
    'tauri://localhost',
    'http://tauri.localhost',
    'https://tauri.localhost',
  ];
  const localDevOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
  ];
  const envOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = Array.from(
    new Set([...envOrigins, ...localDevOrigins, ...tauriOrigins]),
  );

  // CORS (prod-da domen bilan)
  app.enableCors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  });

  // DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const uploadsRoot = join(process.cwd(), 'uploads');
  const productsDir = join(uploadsRoot, 'products');
  const shiftsDir = join(uploadsRoot, 'shifts');
  if (!existsSync(productsDir)) {
    mkdirSync(productsDir, { recursive: true });
  }
  if (!existsSync(shiftsDir)) {
    mkdirSync(shiftsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsRoot, { prefix: '/uploads' });

  const host = process.env.HOST || '0.0.0.0';
  const preferredPort = Number(process.env.PORT || 3000);
  const port = await pickAvailablePort(preferredPort, host);

  if (port !== preferredPort) {
    logger.warn(
      `Port ${preferredPort} band. Server ${port} portda ishga tushdi.`,
    );
  }

  await app.listen(port, host);
  logger.log(`API running on http://${host}:${port}/api`);
  if (allowedOrigins.length) {
    logger.log(`CORS origins: ${allowedOrigins.join(', ')}`);
  }
}

bootstrap();
