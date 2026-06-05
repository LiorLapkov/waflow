import type { UserRole } from '@dljobs/shared';

/** Полезная нагрузка JWT и форма req.user после аутентификации. */
export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}
