import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document } from '../../database/entities/document.entity';
import { DocumentVersion } from '../../database/entities/document-version.entity';
import { Collaborator } from '../../database/entities/collaborator.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Document, DocumentVersion, Collaborator])],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
