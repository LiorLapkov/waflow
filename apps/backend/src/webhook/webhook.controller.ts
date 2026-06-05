import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { wahaWebhookSchema, type WahaWebhook } from '@waflow/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { WebhookGuard } from './webhook.guard';
import { WebhookService } from './webhook.service';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhook: WebhookService) {}

  // Evolution posts events here. Protected by WebhookGuard. Idempotency is handled by the ingest path.
  @UseGuards(WebhookGuard)
  @Post('waha')
  @HttpCode(200)
  async waha(
    @Body(new ZodValidationPipe(wahaWebhookSchema)) body: WahaWebhook,
  ): Promise<{ ok: true }> {
    await this.webhook.handle(body);
    return { ok: true };
  }
}
