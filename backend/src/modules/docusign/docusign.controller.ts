import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Headers, Res } from '@nestjs/common';
import { Response } from 'express';
import { DocusignService } from './docusign.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('docusign')
export class DocusignController {
  constructor(private docusignService: DocusignService) {}

  @Get('auth')
  @UseGuards(JwtAuthGuard)
  getAuthUrl(@Query('redirectUri') redirectUri: string, @Query('state') state: string) {
    const url = this.docusignService.getAuthorizationUrl(redirectUri, state);
    return { authUrl: url };
  }

  @Post('token')
  @UseGuards(JwtAuthGuard)
  async exchangeToken(@Body() body: { code: string; redirectUri: string }) {
    return this.docusignService.exchangeCodeForToken(body.code, body.redirectUri);
  }

  @Post('envelopes')
  @UseGuards(JwtAuthGuard)
  async createEnvelope(
    @Request() req,
    @Headers('x-docusign-token') accessToken: string,
    @Body() body: {
      documentId: string;
      signers: { email: string; name: string; order: number }[];
    },
  ) {
    return this.docusignService.createEnvelope(
      body.documentId,
      req.user.id,
      body.signers,
      accessToken,
    );
  }

  @Post('envelopes/:envelopeId/signing-url')
  @UseGuards(JwtAuthGuard)
  async getSigningUrl(
    @Param('envelopeId') envelopeId: string,
    @Headers('x-docusign-token') accessToken: string,
    @Body() body: {
      signerEmail: string;
      signerName: string;
      returnUrl: string;
    },
  ) {
    const url = await this.docusignService.getSigningUrl(
      envelopeId,
      body.signerEmail,
      body.signerName,
      body.returnUrl,
      accessToken,
    );
    return { signingUrl: url };
  }

  @Get('envelopes/:envelopeId')
  @UseGuards(JwtAuthGuard)
  async getEnvelopeStatus(
    @Param('envelopeId') envelopeId: string,
    @Headers('x-docusign-token') accessToken: string,
  ) {
    return this.docusignService.getEnvelopeStatus(envelopeId, accessToken);
  }

  @Get('documents/:documentId/signatures')
  @UseGuards(JwtAuthGuard)
  async getSignatureRequests(@Param('documentId') documentId: string) {
    return this.docusignService.getSignatureRequests(documentId);
  }

  @Get('envelopes/:envelopeId/download')
  @UseGuards(JwtAuthGuard)
  async downloadSignedDocument(
    @Param('envelopeId') envelopeId: string,
    @Headers('x-docusign-token') accessToken: string,
    @Res() res: Response,
  ) {
    const buffer = await this.docusignService.downloadSignedDocument(envelopeId, accessToken);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="signed-document-${envelopeId}.pdf"`,
    });
    res.send(buffer);
  }

  @Post('webhook')
  async handleWebhook(@Body() payload: any) {
    return this.docusignService.handleWebhook(payload);
  }
}
