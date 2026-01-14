import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ShareLinksService } from './share-links.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class CreateShareLinkDto {
  expiresInDays?: number;
  targetLanguage?: string;
}

@Controller()
export class ShareLinksController {
  constructor(private shareLinksService: ShareLinksService) {}

  @Post('documents/:id/share')
  @UseGuards(JwtAuthGuard)
  async createShareLink(
    @Request() req,
    @Param('id') documentId: string,
    @Body() body: CreateShareLinkDto,
  ) {
    return this.shareLinksService.create(
      documentId, 
      req.user.id, 
      body.expiresInDays,
      body.targetLanguage || 'en',
    );
  }

  @Get('documents/:id/shares')
  @UseGuards(JwtAuthGuard)
  async getShareLinks(@Request() req, @Param('id') documentId: string) {
    return this.shareLinksService.findByDocument(documentId, req.user.id);
  }

  @Delete('shares/:token')
  @UseGuards(JwtAuthGuard)
  async revokeShareLink(@Request() req, @Param('token') token: string) {
    await this.shareLinksService.revoke(token, req.user.id);
    return { success: true };
  }

  @Get('shared/:token')
  async getSharedDocument(
    @Param('token') token: string,
    @Query('lang') lang?: string,
  ) {
    return this.shareLinksService.getDocumentByToken(token, lang);
  }

  @Post('shared/:token/explain')
  async explainShared(
    @Param('token') token: string,
    @Body() body: any,
  ) {
    console.log('[explainShared] Raw body:', JSON.stringify(body));
    const clause = body?.clause || '';
    const language = body?.language || 'English';
    console.log('[explainShared] clause:', clause?.substring(0, 50), 'length:', clause?.length);
    return this.shareLinksService.explainByToken(token, clause, language);
  }
}
