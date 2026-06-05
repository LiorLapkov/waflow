import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@dljobs/shared';
import type { AppEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

/**
 * Создаёт первого администратора при старте, если его ещё нет.
 * Идемпотентно — работает и в docker, и при локальном запуске.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const username = this.config.get('ADMIN_USERNAME', { infer: true });
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      return;
    }
    const password = this.config.get('ADMIN_PASSWORD', { infer: true });
    const passwordHash = await AuthService.hashPassword(password);
    await this.prisma.user.create({
      data: { username, passwordHash, role: UserRole.Admin },
    });
    this.logger.log(`Создан администратор "${username}".`);
  }
}
