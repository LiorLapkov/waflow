import { Injectable } from '@nestjs/common';
import type { ChatDto } from '@waflow/shared';
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

  /** Chats of a number, sorted by latest activity. */
  async listByNumber(user: AuthUser, numberId: string): Promise<ChatDto[]> {
    await this.numbers.assertAccess(user, numberId);
    const chats = await this.prisma.chat.findMany({
      where: { numberId },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    });
    return chats.map(toChatDto);
  }
}
