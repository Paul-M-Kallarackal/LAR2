import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShareLinksService } from './share-links.service';
import { ShareLinksController } from './share-links.controller';
import { ShareLink } from '../../database/entities/share-link.entity';
import { DocumentsModule } from '../documents/documents.module';
import { TranslationModule } from '../translation/translation.module';
import { SummarizationModule } from '../summarization/summarization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShareLink]),
    DocumentsModule,
    forwardRef(() => TranslationModule),
    SummarizationModule,
  ],
  controllers: [ShareLinksController],
  providers: [ShareLinksService],
  exports: [ShareLinksService],
})
export class ShareLinksModule {}
