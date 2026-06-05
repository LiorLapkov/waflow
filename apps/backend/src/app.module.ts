import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { StorageModule } from './storage/storage.module';
import { NumbersModule } from './numbers/numbers.module';
import { RealtimeModule } from './realtime/realtime.module';
import { MessagesModule } from './messages/messages.module';
import { ChatsModule } from './chats/chats.module';
import { WebhookModule } from './webhook/webhook.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // В docker переменные приходят из environment; локально — из корневого .env.
      envFilePath: ['../../.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    WhatsappModule,
    StorageModule,
    AuthModule,
    UsersModule,
    NumbersModule,
    RealtimeModule,
    MessagesModule,
    ChatsModule,
    WebhookModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
