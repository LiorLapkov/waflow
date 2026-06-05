import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NumbersModule } from '../numbers/numbers.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MessagesController } from './messages.controller';
import { MediaController } from './media.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [AuthModule, NumbersModule, RealtimeModule],
  controllers: [MessagesController, MediaController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
