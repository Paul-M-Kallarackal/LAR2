import { Module } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { QuestionnaireController } from './questionnaire.controller';
import { DocumentsModule } from '../documents/documents.module';
import { SttModule } from '../stt/stt.module';

@Module({
  imports: [DocumentsModule, SttModule],
  controllers: [QuestionnaireController],
  providers: [QuestionnaireService],
  exports: [QuestionnaireService],
})
export class QuestionnaireModule {}
