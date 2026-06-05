import { Controller, Get, NotFoundException, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';
import { NumbersService } from '../numbers/numbers.service';

// Proxied media download from MinIO with a per-number access check.
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly numbers: NumbersService,
  ) {}

  @Get(':id')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    const message = await this.prisma.message.findUnique({ where: { mediaId: id } });
    if (!message) {
      throw new NotFoundException('Media not attached to a message');
    }
    await this.numbers.assertAccess(user, message.numberId);

    const { stream, contentType } = await this.storage.getStream(media.storageKey);
    res.setHeader('Content-Type', media.mimeType || contentType);
    if (media.fileName) {
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(media.fileName)}"`);
    }
    stream.pipe(res);
  }
}
