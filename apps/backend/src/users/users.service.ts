import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AssignNumbersDto, CreateUserDto, UserDto } from '@dljobs/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { toUserDto } from './user.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    return users.map(toUserDto);
  }

  async create(dto: CreateUserDto): Promise<UserDto> {
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (exists) {
      throw new ConflictException('Пользователь с таким логином уже существует');
    }
    const passwordHash = await AuthService.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: { username: dto.username, passwordHash, role: dto.role },
    });
    return toUserDto(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    await this.prisma.user.delete({ where: { id } });
  }

  /** Назначить оператору список номеров (полная замена назначений). */
  async assignNumbers(operatorId: string, dto: AssignNumbersDto): Promise<{ numberIds: string[] }> {
    const operator = await this.prisma.user.findUnique({ where: { id: operatorId } });
    if (!operator) {
      throw new NotFoundException('Оператор не найден');
    }
    await this.prisma.$transaction([
      this.prisma.operatorNumber.deleteMany({ where: { operatorId } }),
      this.prisma.operatorNumber.createMany({
        data: dto.numberIds.map((numberId) => ({ operatorId, numberId })),
        skipDuplicates: true,
      }),
    ]);
    return { numberIds: dto.numberIds };
  }

  async getAssignments(operatorId: string): Promise<{ numberIds: string[] }> {
    const rows = await this.prisma.operatorNumber.findMany({
      where: { operatorId },
      select: { numberId: true },
    });
    return { numberIds: rows.map((r) => r.numberId) };
  }
}
