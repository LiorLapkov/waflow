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
  // CORS: разрешаем все origin'ы из FRONTEND_ORIGIN (через запятую).
  // С реверс-прокси (Caddy) фронт и бэкенд same-origin — CORS не используется,
  // но конфигурация остаётся на случай прямого захода с другого хоста.
  const origins = config
    .get('FRONTEND_ORIGIN', { infer: true })
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length === 1 ? origins[0] : origins,
    credentials: true,
  });
  // Глобальный префикс /api для всех HTTP-роутов, КРОМЕ webhook'а WAHA и health.
  // Это нужно, чтобы реверс-прокси мог чисто маршрутизировать /api/* → backend,
  // а статика и страницы Next.js — на frontend.
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'webhooks/(.*)', method: RequestMethod.ALL },
      { path: 'health', method: RequestMethod.GET },
    ],
  });

  const port = config.get('BACKEND_PORT', { infer: true });
  await app.listen(port);
  Logger.log(`Backend запущен на порту ${port}`, 'Bootstrap');
}

void bootstrap();
