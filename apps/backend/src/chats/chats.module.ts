import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NumbersModule } from '../numbers/numbers.module';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';

@Module({
  imports: [AuthModule, NumbersModule],
  controllers: [ChatsController],
  providers: [ChatsService],
})
export class ChatsModule {}
