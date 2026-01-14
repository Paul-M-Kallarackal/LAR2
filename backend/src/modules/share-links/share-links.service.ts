import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShareLink } from '../../database/entities/share-link.entity';
import { DocumentsService } from '../documents/documents.service';
import { TranslationService } from '../translation/translation.service';
import { SummarizationService } from '../summarization/summarization.service';
import { randomBytes } from 'crypto';

@Injectable()
export class ShareLinksService {
  constructor(
    @InjectRepository(ShareLink)
    private shareLinkRepository: Repository<ShareLink>,
    private documentsService: DocumentsService,
    private translationService: TranslationService,
    private summarizationService: SummarizationService,
  ) {}

  async create(
    documentId: string, 
    userId: string, 
    expiresInDays?: number,
    targetLanguage: string = 'en',
  ): Promise<ShareLink> {
    await this.documentsService.findOne(documentId, userId);

    const token = this.generateToken();
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const shareLink = this.shareLinkRepository.create({
      documentId,
      token,
      createdBy: userId,
      expiresAt,
      targetLanguage,
    });

    return this.shareLinkRepository.save(shareLink);
  }

  async findByToken(token: string): Promise<ShareLink> {
    const shareLink = await this.shareLinkRepository.findOne({
      where: { token },
      relations: ['document', 'creator'],
    });

    if (!shareLink) {
      throw new NotFoundException('Share link not found');
    }

    if (shareLink.revoked) {
      throw new ForbiddenException('This share link has been revoked');
    }

    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      throw new ForbiddenException('This share link has expired');
    }

    return shareLink;
  }

  async getDocumentByToken(token: string, requestedLang?: string): Promise<{ document: any; shareLink: any; availableLanguages: any[] }> {
    const shareLink = await this.findByToken(token);
    
    await this.shareLinkRepository.update(shareLink.id, {
      accessCount: shareLink.accessCount + 1,
    });

    const targetLang = requestedLang || shareLink.targetLanguage || 'en';
    
    let content = shareLink.document.content;
    
    if (targetLang !== 'en') {
      try {
        content = await this.translationService.getOrCreateDocumentTranslation(
          shareLink.documentId,
          targetLang,
        );
      } catch (error) {
        console.error('Translation failed, returning original content:', error);
      }
    }

    return {
      document: {
        ...shareLink.document,
        content,
        currentLanguage: targetLang,
      },
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        targetLanguage: shareLink.targetLanguage,
        expiresAt: shareLink.expiresAt,
        accessCount: shareLink.accessCount + 1,
      },
      availableLanguages: this.translationService.getSupportedLanguages(),
    };
  }

  async findByDocument(documentId: string, userId: string): Promise<ShareLink[]> {
    await this.documentsService.findOne(documentId, userId);
    
    return this.shareLinkRepository.find({
      where: { documentId, createdBy: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async revoke(token: string, userId: string): Promise<void> {
    const shareLink = await this.shareLinkRepository.findOne({
      where: { token },
    });

    if (!shareLink) {
      throw new NotFoundException('Share link not found');
    }

    if (shareLink.createdBy !== userId) {
      throw new ForbiddenException('You can only revoke your own share links');
    }

    await this.shareLinkRepository.update(shareLink.id, { revoked: true });
  }

  async setAccessor(token: string, userId: string): Promise<void> {
    const shareLink = await this.findByToken(token);
    
    if (!shareLink.accessedBy) {
      await this.shareLinkRepository.update(shareLink.id, { accessedBy: userId });
    }
  }

  async explainByToken(token: string, clause: string, language?: string): Promise<{ explanation: string }> {
    console.log('[explainByToken] token:', token?.substring(0, 20) + '...', 'clause length:', clause?.length, 'language:', language);
    
    try {
      await this.findByToken(token);
      console.log('[explainByToken] Token validated');
    } catch (err) {
      console.error('[explainByToken] Token validation failed:', err.message);
      throw err;
    }

    const trimmed = (clause || '').trim();
    console.log('[explainByToken] trimmed length:', trimmed.length);
    
    if (!trimmed) {
      throw new BadRequestException('Please select some text to explain.');
    }

    const limited = trimmed.length > 2000 ? trimmed.slice(0, 2000) : trimmed;
    
    try {
      console.log('[explainByToken] Calling summarizationService.explainClause...');
      const explanation = await this.summarizationService.explainClause(limited, language || 'English');
      console.log('[explainByToken] Got explanation, length:', explanation?.length);
      return { explanation };
    } catch (err) {
      console.error('[explainByToken] OpenAI call failed:', err.message);
      throw err;
    }
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }
}
