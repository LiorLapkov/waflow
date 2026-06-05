import { z } from 'zod';

/** Схема и валидация переменных окружения бэкенда. Падаем рано при отсутствии секретов. */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BACKEND_PORT: z.coerce.number().int().positive().default(3001),
  BACKEND_PUBLIC_URL: z.string().url(),
  /**
   * Список разрешённых origin'ов фронта (CORS). Разделитель — запятая.
   * Пример для демо: "http://localhost:3002,http://192.168.1.5:3002".
   */
  FRONTEND_ORIGIN: z.string().min(1),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET слишком короткий'),
  JWT_EXPIRES_IN: z.string().default('12h'),

  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(8),

  EVOLUTION_BASE_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(8),
  /** Секрет, который Evolution кладёт в поле `apikey` каждого webhook-payload'а. */
  EVOLUTION_WEBHOOK_SECRET: z.string().min(8),

  MINIO_ENDPOINT: z.string().url(),
  MINIO_ROOT_USER: z.string().min(1),
  MINIO_ROOT_PASSWORD: z.string().min(1),
  MINIO_BUCKET: z.string().min(1).default('whatsapp-media'),
  MINIO_REGION: z.string().default('us-east-1'),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Некорректные переменные окружения:\n${issues}`);
  }
  return parsed.data;
}
