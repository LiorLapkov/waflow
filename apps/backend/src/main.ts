import 'reflect-metadata';
import { Logger, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import type { AppEnv } from './config/env';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<AppEnv, true>);

  app.use(cookieParser());
  // CORS: allow every origin listed in FRONTEND_ORIGIN (comma-separated).
  // With the Caddy reverse-proxy frontend and backend are same-origin — CORS is not used,
  // but the config stays in place for direct access from another host.
  const origins = config
    .get('FRONTEND_ORIGIN', { infer: true })
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length === 1 ? origins[0] : origins,
    credentials: true,
  });
  // Global /api prefix for every HTTP route EXCEPT the provider webhook and health.
  // This lets the reverse-proxy cleanly route /api/* → backend,
  // while static assets and Next.js pages go to the frontend.
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'webhooks/(.*)', method: RequestMethod.ALL },
      { path: 'health', method: RequestMethod.GET },
    ],
  });

  const port = config.get('BACKEND_PORT', { infer: true });
  await app.listen(port);
  Logger.log(`Backend listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
