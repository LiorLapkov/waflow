import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  SocketEvent,
  UserRole,
  type ChatUpdatedPayload,
  type MessageNewPayload,
  type SessionQrPayload,
  type SessionStatusPayload,
} from '@waflow/shared';
import type { AppEnv } from '../config/env';
import type { JwtPayload } from '../common/types';
import { NumbersService } from '../numbers/numbers.service';

const ADMIN_ROOM = 'role:admin';
const numberRoom = (numberId: string) => `number:${numberId}`;

/**
 * Socket.io gateway. Auth via the `token` cookie (or auth.token).
 * Clients only receive events for numbers they have access to.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppEnv, true>,
    private readonly numbers: NumbersService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get('JWT_SECRET', { infer: true }),
      });
      const user = { id: payload.sub, username: payload.username, role: payload.role };
      if (user.role === UserRole.Admin) {
        await client.join(ADMIN_ROOM);
      }
      const ids = await this.numbers.accessibleNumberIds(user);
      await Promise.all(ids.map((id) => client.join(numberRoom(id))));
    } catch (err) {
      this.logger.warn(`Socket rejected: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken) {
      return authToken;
    }
    const cookie = client.handshake.headers.cookie;
    if (!cookie) {
      return null;
    }
    const match = cookie.split(';').map((c) => c.trim().split('='));
    const tokenPair = match.find(([k]) => k === 'token');
    return tokenPair?.[1] ? decodeURIComponent(tokenPair[1]) : null;
  }

  // ── Emitters (called from services) ────────────────────────────────────

  emitMessageNew(payload: MessageNewPayload): void {
    this.server.to(numberRoom(payload.numberId)).to(ADMIN_ROOM).emit(SocketEvent.MessageNew, payload);
  }

  emitChatUpdated(payload: ChatUpdatedPayload): void {
    this.server
      .to(numberRoom(payload.numberId))
      .to(ADMIN_ROOM)
      .emit(SocketEvent.ChatUpdated, payload);
  }

  emitSessionStatus(payload: SessionStatusPayload): void {
    this.server
      .to(numberRoom(payload.numberId))
      .to(ADMIN_ROOM)
      .emit(SocketEvent.SessionStatus, payload);
  }

  emitSessionQr(payload: SessionQrPayload): void {
    this.server
      .to(numberRoom(payload.numberId))
      .to(ADMIN_ROOM)
      .emit(SocketEvent.SessionQr, payload);
  }
}
