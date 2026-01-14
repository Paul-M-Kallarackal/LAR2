import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../database/entities/document.entity';
import { DocumentVersion } from '../../database/entities/document-version.entity';
import { Collaborator, Permission } from '../../database/entities/collaborator.entity';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/document.dto';

@Injectable()
export class DocumentsService {
  private readonly DEMO_USER_UUID = '00000000-0000-0000-0000-000000000001';

  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private versionsRepository: Repository<DocumentVersion>,
    @InjectRepository(Collaborator)
    private collaboratorsRepository: Repository<Collaborator>,
  ) {}

  private normalizeUserId(userId: string): string {
    return userId === 'demo-user' ? this.DEMO_USER_UUID : userId;
  }

  async create(userId: string, createDto: CreateDocumentDto) {
    const normalizedUserId = this.normalizeUserId(userId);
    const document = this.documentsRepository.create({
      ...createDto,
      ownerId: normalizedUserId,
      content: createDto.content || { type: 'doc', content: [] },
    });
    return this.documentsRepository.save(document);
  }

  async findAllForUser(userId: string) {
    if (userId === 'demo-user') {
      return this.documentsRepository.find({
        order: { updatedAt: 'DESC' },
      });
    }

    const normalizedUserId = this.normalizeUserId(userId);
    const owned = await this.documentsRepository.find({
      where: { ownerId: normalizedUserId },
      order: { updatedAt: 'DESC' },
    });

    const collaborations = await this.collaboratorsRepository.find({
      where: { userId: normalizedUserId },
      relations: ['document'],
    });

    const shared = collaborations.map(c => c.document);
    return [...owned, ...shared];
  }

  async findOne(id: string, userId: string) {
    const document = await this.documentsRepository.findOne({
      where: { id },
      relations: ['owner', 'collaborators', 'collaborators.user'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (userId === 'demo-user') {
      return document;
    }

    const normalizedUserId = this.normalizeUserId(userId);
    const hasAccess = await this.checkAccess(id, normalizedUserId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return document;
  }

  async findOnePublic(id: string) {
    const document = await this.documentsRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async update(id: string, userId: string, updateDto: UpdateDocumentDto) {
    const document = await this.findOne(id, userId);
    const normalizedUserId = this.normalizeUserId(userId);
    
    if (userId !== 'demo-user') {
      const permission = await this.getPermission(id, normalizedUserId);
      if (permission !== Permission.EDIT && document.ownerId !== normalizedUserId) {
        throw new ForbiddenException('Edit access required');
      }
    }

    if (userId !== 'demo-user') {
      await this.versionsRepository.save({
        documentId: id,
        content: document.content,
        createdById: normalizedUserId,
      });
    }

    Object.assign(document, updateDto);
    return this.documentsRepository.save(document);
  }

  async delete(id: string, userId: string) {
    const document = await this.findOne(id, userId);
    const normalizedUserId = this.normalizeUserId(userId);
    if (userId !== 'demo-user' && document.ownerId !== normalizedUserId) {
      throw new ForbiddenException('Only owner can delete');
    }
    await this.documentsRepository.delete(id);
    return { deleted: true };
  }

  async addCollaborator(documentId: string, ownerId: string, collaboratorUserId: string, permission: Permission) {
    const document = await this.findOne(documentId, ownerId);
    const normalizedOwnerId = this.normalizeUserId(ownerId);
    if (ownerId !== 'demo-user' && document.ownerId !== normalizedOwnerId) {
      throw new ForbiddenException('Only owner can add collaborators');
    }

    const normalizedCollaboratorUserId = this.normalizeUserId(collaboratorUserId);
    const existing = await this.collaboratorsRepository.findOne({
      where: { documentId, userId: normalizedCollaboratorUserId },
    });

    if (existing) {
      existing.permission = permission;
      return this.collaboratorsRepository.save(existing);
    }

    return this.collaboratorsRepository.save({
      documentId,
      userId: normalizedCollaboratorUserId,
      permission,
    });
  }

  async removeCollaborator(documentId: string, ownerId: string, collaboratorUserId: string) {
    const document = await this.findOne(documentId, ownerId);
    const normalizedOwnerId = this.normalizeUserId(ownerId);
    if (ownerId !== 'demo-user' && document.ownerId !== normalizedOwnerId) {
      throw new ForbiddenException('Only owner can remove collaborators');
    }

    const normalizedCollaboratorUserId = this.normalizeUserId(collaboratorUserId);
    await this.collaboratorsRepository.delete({ documentId, userId: normalizedCollaboratorUserId });
    return { removed: true };
  }

  async getVersions(documentId: string, userId: string) {
    await this.findOne(documentId, userId);
    return this.versionsRepository.find({
      where: { documentId },
      order: { createdAt: 'DESC' },
      relations: ['createdBy'],
    });
  }

  private async checkAccess(documentId: string, userId: string) {
    const document = await this.documentsRepository.findOne({
      where: { id: documentId },
    });

    if (!document) return false;
    const normalizedUserId = this.normalizeUserId(userId);
    if (document.ownerId === normalizedUserId) return true;

    const collaboration = await this.collaboratorsRepository.findOne({
      where: { documentId, userId: normalizedUserId },
    });

    return !!collaboration;
  }

  private async getPermission(documentId: string, userId: string): Promise<Permission | null> {
    const document = await this.documentsRepository.findOne({
      where: { id: documentId },
    });

    const normalizedUserId = this.normalizeUserId(userId);
    if (document?.ownerId === normalizedUserId) return Permission.EDIT;

    const collaboration = await this.collaboratorsRepository.findOne({
      where: { documentId, userId: normalizedUserId },
    });

    return collaboration?.permission || null;
  }
}
