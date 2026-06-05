import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NumbersModule } from '../numbers/numbers.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [AuthModule, NumbersModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
