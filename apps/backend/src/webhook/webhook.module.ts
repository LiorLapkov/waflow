import { Module } from '@nestjs/common';
import { NumbersModule } from '../numbers/numbers.module';
import { MessagesModule } from '../messages/messages.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [NumbersModule, MessagesModule, RealtimeModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
