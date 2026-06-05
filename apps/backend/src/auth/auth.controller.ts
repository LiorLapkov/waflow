import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { loginDtoSchema, type AuthResultDto, type LoginDto, type UserDto } from '@waflow/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../common/decorators';
import type { AuthUser } from '../common/types';
import type { AppEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { toUserDto } from '../users/user.mapper';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<AppEnv, true>,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginDtoSchema)) dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    const result = await this.auth.login(dto);
    const isProd = this.config.get('NODE_ENV', { infer: true }) === 'production';
    // JWT in an httpOnly cookie — invisible to JS, protects against XSS token theft.
    res.cookie('token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 12,
      path: '/',
    });
    return result;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    res.clearCookie('token', { path: '/' });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<UserDto> {
    const entity = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return toUserDto(entity);
  }
}
