import type { User } from '@prisma/client';
import type { UserDto } from '@dljobs/shared';

/** Маппинг сущности User → безопасный DTO (без passwordHash). */
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
