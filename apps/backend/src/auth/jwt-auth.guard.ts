import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Требует валидный JWT (стратегия 'jwt'). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
