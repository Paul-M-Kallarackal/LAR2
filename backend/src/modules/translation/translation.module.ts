import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranslationService } from './translation.service';
import { TranslationController } from './translation.controller';
import { DocumentsModule } from '../documents/documents.module';
import { DocumentTranslation } from '../../database/entities/document-translation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentTranslation]),
    DocumentsModule,
  ],
  controllers: [TranslationController],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationModule {}
