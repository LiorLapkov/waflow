import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { ChatDto } from '@dljobs/shared';
import { CurrentUser } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatsService } from './chats.service';

@UseGuards(JwtAuthGuard)
@Controller('numbers/:numberId/chats')
export class ChatsController {
  constructor(private readonly chats: ChatsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('numberId') numberId: string): Promise<ChatDto[]> {
    return this.chats.listByNumber(user, numberId);
  }
}
