import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class SummarizationService {
  private openai: OpenAI | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async summarizeText(text: string, language: string = 'English'): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a legal document summarization assistant. Summarize the following loan agreement text in plain, easy-to-understand ${language}. Focus on:
- Key financial terms (amounts, rates, fees)
- Important dates and deadlines
- Rights and obligations of the borrower
- Any penalties or consequences
- Consumer protection rights

Keep the summary concise but comprehensive. Use bullet points for clarity.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || 'Unable to generate summary';
  }

  async explainClause(clause: string, language: string = 'English'): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a legal document assistant helping consumers understand loan agreements. Explain the following clause in plain, simple ${language} that anyone can understand. Avoid legal jargon and explain what this means for the borrower in practical terms.`,
        },
        {
          role: 'user',
          content: clause,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || 'Unable to explain clause';
  }

  async identifyKeyTerms(text: string): Promise<Array<{ term: string; explanation: string }>> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a legal document assistant. Identify and explain the key financial and legal terms in the following loan agreement text. Return a JSON array with objects containing "term" and "explanation" fields. Focus on terms that are important for the borrower to understand.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    try {
      const content = response.choices[0]?.message?.content || '{"terms":[]}';
      const parsed = JSON.parse(content);
      return parsed.terms || [];
    } catch {
      return [];
    }
  }
}
