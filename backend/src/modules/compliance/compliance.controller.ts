import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ComplianceService, AnalyzeOptions } from './compliance.service';
import { AIComplianceService } from './ai-compliance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EUCountry } from '../../database/entities/location.entity';

class AnalyzeDto {
  providerCountry?: EUCountry;
  getterCountry?: EUCountry;
}

@Controller('compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceController {
  constructor(
    private complianceService: ComplianceService,
    private aiComplianceService: AIComplianceService,
  ) {}

  @Get('rules')
  getRules() {
    return this.complianceService.getRules();
  }

  @Get('eu/rules')
  getEURules() {
    return this.complianceService.getRules();
  }

  @Get('eu/countries')
  getEUCountries() {
    return this.complianceService.getEUCountries();
  }

  @Post('documents/:id/analyze')
  async analyzeDocument(
    @Request() req,
    @Param('id') documentId: string,
    @Body() body?: AnalyzeDto,
  ) {
    const options: AnalyzeOptions = {
      providerCountry: body?.providerCountry,
      getterCountry: body?.getterCountry,
    };
    return this.complianceService.analyzeWithHighlights(documentId, req.user.id, options);
  }

  @Post('eu/analyze')
  async analyzeWithLocations(
    @Request() req,
    @Body() body: { documentId: string; providerCountry?: EUCountry; getterCountry?: EUCountry },
  ) {
    const options: AnalyzeOptions = {
      providerCountry: body.providerCountry,
      getterCountry: body.getterCountry,
    };
    return this.complianceService.analyzeDocument(body.documentId, req.user.id, options);
  }

  @Get('documents/:id/reports')
  async getReports(@Param('id') documentId: string) {
    return this.complianceService.getReports(documentId);
  }

  @Get('documents/:id/latest')
  async getLatestReport(@Param('id') documentId: string) {
    return this.complianceService.getLatestReport(documentId);
  }

  @Post('negotiate')
  async getNegotiationAdvice(
    @Body() body: { clause: string; concern: string },
  ) {
    const advice = await this.aiComplianceService.analyzeClauseForNegotiation(
      body.clause,
      body.concern,
    );
    return { advice };
  }

  @Get('ai/status')
  getAIStatus() {
    return { available: this.aiComplianceService.isAvailable() };
  }
}
