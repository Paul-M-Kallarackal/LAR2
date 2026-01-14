import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment, CommentType } from '../../database/entities/comment.entity';

export interface CreateCommentDto {
  documentId: string;
  sectionId?: string;
  content: string;
  type?: CommentType;
  parentId?: string;
}

export interface UpdateCommentDto {
  content?: string;
  resolved?: boolean;
}

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
  ) {}

  async create(userId: string, dto: CreateCommentDto): Promise<Comment> {
    const comment = this.commentRepository.create({
      userId,
      documentId: dto.documentId,
      sectionId: dto.sectionId,
      content: dto.content,
      type: dto.type || CommentType.COMMENT,
      parentId: dto.parentId,
    });

    return this.commentRepository.save(comment);
  }

  async findByDocument(documentId: string): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { documentId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async findBySection(documentId: string, sectionId: string): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { documentId, sectionId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async findById(id: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  async update(id: string, userId: string, dto: UpdateCommentDto): Promise<Comment> {
    const comment = await this.findById(id);

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    if (dto.content !== undefined) {
      comment.content = dto.content;
    }

    if (dto.resolved !== undefined) {
      comment.resolved = dto.resolved;
    }

    return this.commentRepository.save(comment);
  }

  async resolve(id: string, userId: string): Promise<Comment> {
    const comment = await this.findById(id);
    comment.resolved = true;
    return this.commentRepository.save(comment);
  }

  async delete(id: string, userId: string): Promise<void> {
    const comment = await this.findById(id);

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepository.remove(comment);
  }

  async getThreads(documentId: string): Promise<Comment[]> {
    const comments = await this.commentRepository.find({
      where: { documentId, parentId: null as any },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    for (const comment of comments) {
      const replies = await this.commentRepository.find({
        where: { parentId: comment.id },
        relations: ['user'],
        order: { createdAt: 'ASC' },
      });
      (comment as any).replies = replies;
    }

    return comments;
  }
}
