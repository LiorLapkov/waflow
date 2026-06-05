import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  sendMessageDtoSchema,
  type ChatDto,
  type MessageDto,
  type SendMessageDto,
} from '@waflow/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagesService } from './messages.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  // Message feed for a chat (chronological).
  @Get('chats/:chatId/messages')
  list(
    @CurrentUser() user: AuthUser,
    @Param('chatId') chatId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ): Promise<MessageDto[]> {
    return this.messages.listMessages(user, chatId, limit ? Number(limit) : 50, before);
  }

  // Operator reply.
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

  // Force-resolve the real phone/name for a LID chat.
  @Post('chats/:chatId/resolve')
  resolve(@CurrentUser() user: AuthUser, @Param('chatId') chatId: string): Promise<ChatDto> {
    return this.messages.resolveChatInfo(user, chatId);
  }
}
