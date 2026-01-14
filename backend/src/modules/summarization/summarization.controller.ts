import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SummarizationService } from './summarization.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class SummarizeDto {
  text: string;
  language?: string;
}

class ExplainDto {
  clause: string;
  language?: string;
}

class KeyTermsDto {
  text: string;
}

@Controller('summarize')
@UseGuards(JwtAuthGuard)
export class SummarizationController {
  constructor(private summarizationService: SummarizationService) {}

  @Post()
  async summarize(@Body() body: SummarizeDto) {
    const summary = await this.summarizationService.summarizeText(body.text, body.language);
    return { summary };
  }

  @Post('explain')
  async explain(@Body() body: ExplainDto) {
    const explanation = await this.summarizationService.explainClause(body.clause, body.language);
    return { explanation };
  }

  @Post('key-terms')
  async keyTerms(@Body() body: KeyTermsDto) {
    const terms = await this.summarizationService.identifyKeyTerms(body.text);
    return { terms };
  }
}
