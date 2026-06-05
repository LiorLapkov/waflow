import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  sendMessageDtoSchema,
  type ChatDto,
  type MessageDto,
  type SendMessageDto,
} from '@dljobs/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagesService } from './messages.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  // Лента сообщений чата (хронологически).
  @Get('chats/:chatId/messages')
  list(
    @CurrentUser() user: AuthUser,
    @Param('chatId') chatId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ): Promise<MessageDto[]> {
    return this.messages.listMessages(user, chatId, limit ? Number(limit) : 50, before);
  }

  // Отправка ответа оператором.
  @Post('messages')
  send(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(sendMessageDtoSchema)) dto: SendMessageDto,
  ): Promise<MessageDto> {
    return this.messages.sendText(user, dto);
  }

  @Post('chats/:chatId/read')
  async markRead(
    @CurrentUser() user: AuthUser,
    @Param('chatId') chatId: string,
  ): Promise<{ ok: true }> {
    await this.messages.markRead(user, chatId);
    return { ok: true };
  }

  // Принудительный резолв реального номера и имени для LID-чата.
  @Post('chats/:chatId/resolve')
  resolve(@CurrentUser() user: AuthUser, @Param('chatId') chatId: string): Promise<ChatDto> {
    return this.messages.resolveChatInfo(user, chatId);
  }
}
