import { Controller, Get, Post, Patch, Delete, Body, Param, Request } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto, AddCollaboratorDto } from './dto/document.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post()
  async create(@Request() req, @Body() createDto: CreateDocumentDto) {
    const userId = req.user?.id || 'demo-user';
    return this.documentsService.create(userId, createDto);
  }

  @Get()
  async findAll(@Request() req) {
    const userId = req.user?.id || 'demo-user';
    return this.documentsService.findAllForUser(userId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const userId = req.user?.id || 'demo-user';
    return this.documentsService.findOne(id, userId);
  }

  @Patch(':id')
  async update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateDocumentDto) {
    const userId = req.user?.id || 'demo-user';
    return this.documentsService.update(id, userId, updateDto);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    const userId = req.user?.id || 'demo-user';
    return this.documentsService.delete(id, userId);
  }

  @Post(':id/collaborators')
  async addCollaborator(@Request() req, @Param('id') id: string, @Body() addDto: AddCollaboratorDto) {
    const userId = req.user?.id || 'demo-user';
    return this.documentsService.addCollaborator(id, userId, addDto.userId, addDto.permission);
  }

  @Delete(':id/collaborators/:userId')
  async removeCollaborator(@Request() req, @Param('id') id: string, @Param('userId') userId: string) {
    const ownerId = req.user?.id || 'demo-user';
    return this.documentsService.removeCollaborator(id, ownerId, userId);
  }

  @Get(':id/versions')
  async getVersions(@Request() req, @Param('id') id: string) {
    const userId = req.user?.id || 'demo-user';
    return this.documentsService.getVersions(id, userId);
  }
}
