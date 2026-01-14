import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { CommentsService, CreateCommentDto, UpdateCommentDto } from './comments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommentType } from '../../database/entities/comment.entity';

class CreateCommentBodyDto {
  sectionId?: string;
  content: string;
  type?: CommentType;
  parentId?: string;
}

class UpdateCommentBodyDto {
  content?: string;
  resolved?: boolean;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get('documents/:id/comments')
  async getComments(@Param('id') documentId: string, @Query('sectionId') sectionId?: string) {
    if (sectionId) {
      return this.commentsService.findBySection(documentId, sectionId);
    }
    return this.commentsService.findByDocument(documentId);
  }

  @Get('documents/:id/comments/threads')
  async getThreads(@Param('id') documentId: string) {
    return this.commentsService.getThreads(documentId);
  }

  @Post('documents/:id/comments')
  async createComment(
    @Request() req,
    @Param('id') documentId: string,
    @Body() body: CreateCommentBodyDto,
  ) {
    const dto: CreateCommentDto = {
      documentId,
      ...body,
    };
    return this.commentsService.create(req.user.id, dto);
  }

  @Patch('comments/:id')
  async updateComment(
    @Request() req,
    @Param('id') id: string,
    @Body() body: UpdateCommentBodyDto,
  ) {
    return this.commentsService.update(id, req.user.id, body);
  }

  @Post('comments/:id/resolve')
  async resolveComment(@Request() req, @Param('id') id: string) {
    return this.commentsService.resolve(id, req.user.id);
  }

  @Delete('comments/:id')
  async deleteComment(@Request() req, @Param('id') id: string) {
    await this.commentsService.delete(id, req.user.id);
    return { success: true };
  }
}
