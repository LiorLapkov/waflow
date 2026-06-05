import type { UserRole } from '@waflow/shared';

/** JWT payload and the shape attached to req.user after authentication. */
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
