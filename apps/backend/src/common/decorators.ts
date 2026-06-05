import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { UserRole } from '@dljobs/shared';
import type { AuthUser } from './types';

export const ROLES_KEY = 'roles';
/** Ограничивает доступ к роутеру/методу указанными ролями. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** Достаёт аутентифицированного пользователя из запроса. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);
