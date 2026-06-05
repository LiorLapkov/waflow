import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  assignNumbersDtoSchema,
  createUserDtoSchema,
  UserRole,
  type AssignNumbersDto,
  type CreateUserDto,
  type UserDto,
} from '@dljobs/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Roles } from '../common/decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from './users.service';

// Управление пользователями — только Admin.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(): Promise<UserDto[]> {
    return this.users.list();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createUserDtoSchema)) dto: CreateUserDto,
  ): Promise<UserDto> {
    return this.users.create(dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ ok: true }> {
    await this.users.remove(id);
    return { ok: true };
  }

  @Get(':id/numbers')
  getAssignments(@Param('id') id: string): Promise<{ numberIds: string[] }> {
    return this.users.getAssignments(id);
  }

  @Put(':id/numbers')
  assignNumbers(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignNumbersDtoSchema)) dto: AssignNumbersDto,
  ): Promise<{ numberIds: string[] }> {
    return this.users.assignNumbers(id, dto);
  }
}
