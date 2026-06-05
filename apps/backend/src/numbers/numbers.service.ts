import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  SessionStatus,
  UserRole,
  type CreateNumberDto,
  type QrDto,
  type WhatsappNumberDto,
} from '@dljobs/shared';
import type { WhatsappNumber } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class NumbersService {
  private readonly logger = new Logger(NumbersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly waha: WhatsappService,
  ) {}

  /** ID номеров, доступных пользователю (Admin — все, Operator — назначенные). */
  async accessibleNumberIds(user: AuthUser): Promise<string[]> {
    if (user.role === UserRole.Admin) {
      const all = await this.prisma.whatsappNumber.findMany({ select: { id: true } });
      return all.map((n) => n.id);
    }
    const rows = await this.prisma.operatorNumber.findMany({
      where: { operatorId: user.id },
      select: { numberId: true },
    });
    return rows.map((r) => r.numberId);
  }

  /** Бросает 403/404, если у пользователя нет доступа к номеру. */
  async assertAccess(user: AuthUser, numberId: string): Promise<WhatsappNumber> {
    const number = await this.prisma.whatsappNumber.findUnique({ where: { id: numberId } });
    if (!number) {
      throw new NotFoundException('Номер не найден');
    }
    if (user.role !== UserRole.Admin) {
      const assigned = await this.prisma.operatorNumber.findUnique({
        where: { operatorId_numberId: { operatorId: user.id, numberId } },
      });
      if (!assigned) {
        throw new ForbiddenException('Нет доступа к этому номеру');
      }
    }
    return number;
  }

  async list(user: AuthUser): Promise<WhatsappNumberDto[]> {
    const ids = await this.accessibleNumberIds(user);
    const numbers = await this.prisma.whatsappNumber.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: 'asc' },
    });
    const unread = await this.prisma.chat.groupBy({
      by: ['numberId'],
      where: { numberId: { in: ids } },
      _sum: { unreadCount: true },
    });
    const unreadByNumber = new Map(unread.map((u) => [u.numberId, u._sum.unreadCount ?? 0]));
    return numbers.map((n) => this.toDto(n, unreadByNumber.get(n.id) ?? 0));
  }

  /** Создать номер и поднять инстанс в Evolution. Multi-instance: ограничений нет. */
  async create(dto: CreateNumberDto): Promise<WhatsappNumberDto> {
    // Уникальное имя инстанса (используется как ключ в Evolution и в нашей БД).
    const instanceName = `n_${Math.random().toString(36).slice(2, 10)}`;
    const number = await this.prisma.whatsappNumber.create({
      data: { name: dto.name, wahaSession: instanceName, status: SessionStatus.Starting },
    });
    // Авто-назначение всем операторам — оператор видит ВСЕ номера, заведённые админом.
    const operators = await this.prisma.user.findMany({
      where: { role: UserRole.Operator },
      select: { id: true },
    });
    if (operators.length > 0) {
      await this.prisma.operatorNumber.createMany({
        data: operators.map((o) => ({ operatorId: o.id, numberId: number.id })),
        skipDuplicates: true,
      });
      this.logger.log(`Номер ${number.id} назначен ${operators.length} оператор(ам)`);
    }
    await this.waha.createInstance(instanceName);
    return this.toDto(number, 0);
  }

  /** Перезапустить подключение (новый QR без удаления инстанса). */
  async relink(user: AuthUser, numberId: string): Promise<WhatsappNumberDto> {
    const number = await this.assertAccess(user, numberId);
    await this.waha.connectInstance(number.wahaSession);
    const updated = await this.prisma.whatsappNumber.update({
      where: { id: numberId },
      data: { status: SessionStatus.Starting },
    });
    return this.toDto(updated, 0);
  }

  /** Текущий QR + статус для экрана линковки. Синхронизирует статус в БД. */
  async getQr(user: AuthUser, numberId: string): Promise<QrDto> {
    const number = await this.assertAccess(user, numberId);
    const info = await this.waha.getSessionInfo(number.wahaSession);
    await this.syncStatus(numberId, info.status, info.phone);
    const qr =
      info.status === SessionStatus.ScanQr || info.status === SessionStatus.Starting
        ? await this.waha.getQr(number.wahaSession)
        : null;
    return { numberId, qr, status: info.status };
  }

  async remove(user: AuthUser, numberId: string): Promise<void> {
    const number = await this.assertAccess(user, numberId);
    await this.waha.deleteInstance(number.wahaSession);
    await this.prisma.whatsappNumber.delete({ where: { id: numberId } });
  }

  /** Обновить статус (вызывается из webhook connection.update и при опросе QR). */
  async syncStatus(
    numberId: string,
    status: SessionStatus,
    phone?: string | null,
  ): Promise<WhatsappNumber> {
    return this.prisma.whatsappNumber.update({
      where: { id: numberId },
      data: { status, ...(phone ? { phone } : {}) },
    });
  }

  /** Найти номер по имени инстанса (для роутинга webhook'ов). */
  async findByInstance(instanceName: string): Promise<WhatsappNumber | null> {
    return this.prisma.whatsappNumber.findUnique({ where: { wahaSession: instanceName } });
  }

  private toDto(n: WhatsappNumber, unreadCount: number): WhatsappNumberDto {
    return {
      id: n.id,
      name: n.name,
      wahaSession: n.wahaSession,
      phone: n.phone,
      status: n.status,
      unreadCount,
      createdAt: n.createdAt.toISOString(),
    };
  }
}
