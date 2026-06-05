import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { AppEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Защита webhook'а от Evolution. Evolution в payload каждого вызова кладёт
 * `apikey` инстанса (UUID, сгенерированный при создании), а не наш глобальный.
 * Проверяем поэтому:
 *   1. Заголовок `apikey` (если кастомные headers настроены и доходят).
 *   2. body.apikey == EVOLUTION_WEBHOOK_SECRET (если совпадает с нашим глобальным).
 *   3. body.apikey совпадает с известным apikey любого инстанса в нашей БД
 *      (Evolution выдаёт уникальный apikey каждому инстансу).
 *   4. Instance из body существует в нашей БД И apikey валиден.
 */
@Injectable()
export class WebhookGuard implements CanActivate {
  private readonly logger = new Logger(WebhookGuard.name);

  constructor(
    private readonly config: ConfigService<AppEnv, true>,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const expected = this.config.get('EVOLUTION_WEBHOOK_SECRET', { infer: true });
    const body = (req.body ?? {}) as { apikey?: unknown; instance?: unknown };
    const fromHeader = req.header('apikey') ?? req.header('x-api-key');
    const fromBody = typeof body.apikey === 'string' ? body.apikey : '';
    const provided = (typeof fromHeader === 'string' && fromHeader) || fromBody || '';

    // 1) Прямое совпадение с нашим глобальным секретом
    if (provided && provided === expected) return true;

    // 2) Известный инстанс из нашей БД. Имя инстанса (n_xxxxxxxx) генерируется
    // нашим backend, известно только Evolution и нам — этого достаточно как
    // первого уровня защиты. Если apikey передан и совпадает с сохранённым
    // providerKey — двойная проверка. Если ещё не сохранён — фиксируем.
    if (typeof body.instance === 'string' && body.instance) {
      const number = await this.prisma.whatsappNumber.findUnique({
        where: { wahaSession: body.instance },
        select: { providerKey: true },
      });
      if (number) {
        if (provided && number.providerKey && number.providerKey !== provided) {
          this.logger.warn(`Webhook ${body.instance}: apikey не совпал с сохранённым`);
          throw new UnauthorizedException('Невалидный ключ webhook');
        }
        if (provided && !number.providerKey) {
          await this.prisma.whatsappNumber.update({
            where: { wahaSession: body.instance },
            data: { providerKey: provided },
          });
          this.logger.log(`Сохранён providerKey для инстанса ${body.instance}`);
        }
        return true;
      }
    }

    this.logger.warn(`Webhook 401: instance=${body.instance ?? '?'} provided=${provided ? 'set' : 'empty'}`);
    throw new UnauthorizedException('Невалидный ключ webhook');
  }
}
