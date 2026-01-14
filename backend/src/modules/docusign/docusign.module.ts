import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocusignService } from './docusign.service';
import { DocusignController } from './docusign.controller';
import { SignatureRequest } from '../../database/entities/signature-request.entity';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SignatureRequest]),
    DocumentsModule,
  ],
  controllers: [DocusignController],
  providers: [DocusignService],
  exports: [DocusignService],
})
export class DocusignModule {}
