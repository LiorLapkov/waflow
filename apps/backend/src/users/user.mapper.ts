import type { User } from '@prisma/client';
import type { UserDto } from '@waflow/shared';

/** Map a User entity to a safe DTO (no passwordHash). */
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
