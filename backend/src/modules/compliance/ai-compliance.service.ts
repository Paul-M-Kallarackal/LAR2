import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ComplianceIssue, IssueSeverity } from '../../database/entities/compliance-report.entity';
import { v4 as uuidv4 } from 'uuid';

interface AIAnalysisResult {
  issues: ComplianceIssue[];
  suggestions: string[];
  overallAssessment: string;
}

@Injectable()
export class AIComplianceService {
  private openai: OpenAI | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async analyzeGreenLoanCompliance(documentText: string): Promise<AIAnalysisResult> {
    if (!this.openai) {
      return {
        issues: [],
        suggestions: ['Enable AI analysis by configuring OPENAI_API_KEY'],
        overallAssessment: 'AI analysis unavailable',
      };
    }

    const prompt = `You are a Green Loan compliance expert. Analyze the following document for compliance issues with the LMA Green Loan Principles 2023 and EU Taxonomy Regulation.

DOCUMENT:
${documentText.substring(0, 8000)}

Identify:
1. CRITICAL issues (fossil fuel references, greenwashing, non-eligible uses of proceeds)
2. WARNING issues (weak language, missing mandatory clauses, inadequate verification)
3. INFO issues (missing best practices, vague metrics)

For each issue found, provide:
- The exact text that is problematic (for highlighting)
- The severity level (error/warning/info)
- A clear explanation
- A specific suggestion to fix it

Respond in JSON format:
{
  "issues": [
    {
      "severity": "error|warning|info",
      "category": "Category name",
      "message": "Clear description of the issue",
      "textMatch": "exact text from document",
      "suggestion": "How to fix it"
    }
  ],
  "suggestions": ["General improvement suggestions"],
  "overallAssessment": "Brief overall compliance assessment"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in Green Finance, specifically LMA Green Loan Principles and EU sustainable finance regulations. Provide precise, actionable compliance analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return this.getDefaultResult();
      }

      const parsed = JSON.parse(content);
      return this.processAIResponse(parsed, documentText);
    } catch (error) {
      console.error('AI compliance analysis failed:', error);
      return this.getDefaultResult();
    }
  }

  async analyzeClauseForNegotiation(clause: string, borrowerConcern: string): Promise<string> {
    if (!this.openai) {
      return 'AI negotiation assistance unavailable. Configure OPENAI_API_KEY to enable.';
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a financial negotiation expert helping borrowers understand and negotiate loan terms fairly.',
          },
          {
            role: 'user',
            content: `A borrower has a concern about this loan clause:

CLAUSE:
${clause}

BORROWER'S CONCERN:
${borrowerConcern}

Provide:
1. Plain-language explanation of what this clause means
2. Whether the concern is reasonable
3. Suggested alternative language that would be more balanced
4. Key negotiation points the borrower could raise`,
          },
        ],
        temperature: 0.5,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || 'Unable to generate negotiation advice.';
    } catch (error) {
      console.error('AI negotiation analysis failed:', error);
      return 'AI analysis temporarily unavailable.';
    }
  }

  private processAIResponse(parsed: any, documentText: string): AIAnalysisResult {
    const issues: ComplianceIssue[] = [];

    if (parsed.issues && Array.isArray(parsed.issues)) {
      for (const issue of parsed.issues) {
        const severityMap: Record<string, IssueSeverity> = {
          error: IssueSeverity.ERROR,
          warning: IssueSeverity.WARNING,
          info: IssueSeverity.INFO,
        };

        let startOffset: number | undefined;
        let endOffset: number | undefined;

        if (issue.textMatch) {
          const index = documentText.indexOf(issue.textMatch);
          if (index !== -1) {
            startOffset = index;
            endOffset = index + issue.textMatch.length;
          }
        }

        issues.push({
          id: uuidv4(),
          severity: severityMap[issue.severity?.toLowerCase()] || IssueSeverity.INFO,
          category: issue.category || 'AI Analysis',
          message: issue.message || 'Compliance issue detected',
          suggestion: issue.suggestion,
          textMatch: issue.textMatch,
          startOffset,
          endOffset,
        });
      }
    }

    return {
      issues,
      suggestions: parsed.suggestions || [],
      overallAssessment: parsed.overallAssessment || 'Analysis complete',
    };
  }

  private getDefaultResult(): AIAnalysisResult {
    return {
      issues: [],
      suggestions: [],
      overallAssessment: 'AI analysis could not be completed',
    };
  }

  isAvailable(): boolean {
    return this.openai !== null;
  }
}
