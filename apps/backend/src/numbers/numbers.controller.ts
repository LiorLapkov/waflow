import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  createNumberDtoSchema,
  UserRole,
  type CreateNumberDto,
  type QrDto,
  type WhatsappNumberDto,
} from '@dljobs/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, Roles } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { NumbersService } from './numbers.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('numbers')
export class NumbersController {
  constructor(private readonly numbers: NumbersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<WhatsappNumberDto[]> {
    return this.numbers.list(user);
  }

  // Создание/линковка нового номера — только Admin.
  @Roles(UserRole.Admin)
  @Post()
  create(
    @Body(new ZodValidationPipe(createNumberDtoSchema)) dto: CreateNumberDto,
  ): Promise<WhatsappNumberDto> {
    return this.numbers.create(dto);
  }

  @Get(':id/qr')
  getQr(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<QrDto> {
    return this.numbers.getQr(user, id);
  }

  @Post(':id/relink')
  relink(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<WhatsappNumberDto> {
    return this.numbers.relink(user, id);
  }

  @Roles(UserRole.Admin)
  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<{ ok: true }> {
    await this.numbers.remove(user, id);
    return { ok: true };
  }
}
