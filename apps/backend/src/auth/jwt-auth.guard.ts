import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Requires a valid JWT (the 'jwt' Passport strategy). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
