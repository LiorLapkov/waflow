import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@waflow/shared';
import type { AppEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

/**
 * Creates the first admin on startup if one does not exist yet.
 * Idempotent — works both inside docker and when run locally.
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
    this.logger.log(`Admin "${username}" created.`);
  }
}
