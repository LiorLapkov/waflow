import { Injectable } from '@nestjs/common';
import type { ChatDto } from '@dljobs/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types';
import { NumbersService } from '../numbers/numbers.service';
import { toChatDto } from './chat.mapper';

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: NumbersService,
  ) {}

  /** Чаты номера, отсортированные по последней активности. */
  async listByNumber(user: AuthUser, numberId: string): Promise<ChatDto[]> {
    await this.numbers.assertAccess(user, numberId);
    const chats = await this.prisma.chat.findMany({
      where: { numberId },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    });
    return chats.map(toChatDto);
  }
}
