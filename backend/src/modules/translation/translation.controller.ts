import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('translation')
@UseGuards(JwtAuthGuard)
export class TranslationController {
  constructor(private translationService: TranslationService) {}

  @Get('languages')
  getSupportedLanguages() {
    return this.translationService.getSupportedLanguages();
  }

  @Post('translate')
  async translateText(
    @Body() body: { text: string; targetLanguage: string; sourceLanguage?: string },
  ) {
    return this.translationService.translateText(
      body.text,
      body.targetLanguage,
      body.sourceLanguage,
    );
  }

  @Post('detect')
  async detectLanguage(@Body() body: { text: string }) {
    const language = await this.translationService.detectLanguage(body.text);
    return { language };
  }

  @Post('documents/:id')
  async translateDocument(
    @Request() req,
    @Param('id') documentId: string,
    @Body() body: { targetLanguage: string },
  ) {
    return this.translationService.translateDocument(
      documentId,
      req.user.id,
      body.targetLanguage,
    );
  }
}
