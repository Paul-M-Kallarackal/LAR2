import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { DocumentsService } from '../documents/documents.service';
import { DocumentTranslation } from '../../database/entities/document-translation.entity';

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ru', name: 'Russian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'cs', name: 'Czech' },
  { code: 'el', name: 'Greek' },
];

@Injectable()
export class TranslationService {
  private openai: OpenAI | null = null;

  constructor(
    private configService: ConfigService,
    private documentsService: DocumentsService,
    @InjectRepository(DocumentTranslation)
    private translationCacheRepository: Repository<DocumentTranslation>,
  ) {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      console.warn('OPENAI_API_KEY not set - Translation features will be disabled');
    }
  }

  getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }

  async translateText(text: string, targetLanguage: string, sourceLanguage?: string): Promise<TranslationResult> {
    if (!this.openai) {
      throw new Error('Translation service unavailable - OPENAI_API_KEY not configured');
    }

    const targetLangName = SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.name || targetLanguage;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional legal document translator. Translate the following text to ${targetLangName}. Only output the translated text, nothing else. Preserve formatting, legal terminology, and tone.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
    });

    const translatedText = response.choices[0]?.message?.content || text;

    return {
      translatedText,
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage,
    };
  }

  async detectLanguage(text: string): Promise<string> {
    if (!this.openai) {
      throw new Error('Translation service unavailable - OPENAI_API_KEY not configured');
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Detect the language of the following text. Only respond with the ISO 639-1 two-letter language code (e.g., "en", "es", "fr"). Nothing else.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0,
    });

    return response.choices[0]?.message?.content?.trim().toLowerCase() || 'en';
  }

  async getOrCreateDocumentTranslation(documentId: string, targetLanguage: string): Promise<any> {
    if (targetLanguage === 'en') {
      const document = await this.documentsService.findOnePublic(documentId);
      return document.content;
    }

    const document = await this.documentsService.findOnePublic(documentId);
    
    const cached = await this.translationCacheRepository.findOne({
      where: { documentId, language: targetLanguage },
    });

    if (cached && cached.sourceUpdatedAt >= document.updatedAt) {
      return cached.content;
    }

    const translatedContent = await this.translateDocumentContent(document.content, targetLanguage);

    if (cached) {
      await this.translationCacheRepository.update(cached.id, {
        content: translatedContent,
        sourceUpdatedAt: document.updatedAt,
      });
    } else {
      await this.translationCacheRepository.save({
        documentId,
        language: targetLanguage,
        content: translatedContent,
        sourceUpdatedAt: document.updatedAt,
      });
    }

    return translatedContent;
  }

  async translateDocument(documentId: string, userId: string, targetLanguage: string) {
    if (!this.openai) {
      throw new Error('Translation service unavailable - OPENAI_API_KEY not configured');
    }

    const document = await this.documentsService.findOne(documentId, userId);
    const content = document.content;
    
    const translatedContent = await this.translateDocumentContent(content, targetLanguage);

    return this.documentsService.update(documentId, userId, {
      content: translatedContent,
      language: targetLanguage,
    });
  }

  async translateDocumentContent(content: any, targetLanguage: string): Promise<any> {
    if (!content) return content;
    if (!this.openai) return content;

    if (typeof content === 'string') {
      const result = await this.translateText(content, targetLanguage);
      return result.translatedText;
    }

    if (Array.isArray(content)) {
      const results = [];
      for (const item of content) {
        results.push(await this.translateDocumentContent(item, targetLanguage));
      }
      return results;
    }

    if (typeof content === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(content)) {
        if (key === 'text' && typeof value === 'string') {
          const translated = await this.translateText(value, targetLanguage);
          result[key] = translated.translatedText;
        } else if (key === 'content') {
          result[key] = await this.translateDocumentContent(value, targetLanguage);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    return content;
  }
}
