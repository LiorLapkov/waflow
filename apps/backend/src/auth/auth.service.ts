import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { AuthResultDto, LoginDto, UserDto } from '@waflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../common/types';
import { toUserDto } from '../users/user.mapper';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Password hashing (argon2id). We never store plaintext passwords. */
  static hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  async validateUser(dto: LoginDto): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid username or password');
    }
    return toUserDto(user);
  }

  async login(dto: LoginDto): Promise<AuthResultDto> {
    const user = await this.validateUser(dto);
    const payload: JwtPayload = { sub: user.id, username: user.username, role: user.role };
    const token = await this.jwt.signAsync(payload);
    return { token, user };
  }
}
