import { Controller, Get, Post, Body, Param, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuestionnaireService } from './questionnaire.service';

@Controller('questionnaire')
export class QuestionnaireController {
  constructor(private questionnaireService: QuestionnaireService) {}

  @Get('templates')
  getTemplates() {
    return this.questionnaireService.getTemplates();
  }

  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.questionnaireService.getTemplate(id);
  }

  @Get('templates/:id/fields')
  getFields(@Param('id') id: string) {
    return this.questionnaireService.getQuestionnaireFields(id);
  }

  @Post('templates/:id/fill')
  async fillTemplate(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { answers: Record<string, string> },
  ) {
    const userId = req.user?.id || 'demo-user';
    return this.questionnaireService.fillTemplate(userId, id, body.answers);
  }

  @Post('templates/:id/sections/:sectionName/voice')
  @UseInterceptors(FileInterceptor('audio'))
  async processSectionVoice(
    @Param('id') id: string,
    @Param('sectionName') sectionName: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.questionnaireService.processSectionVoice(id, sectionName, file.buffer, file.mimetype);
  }
}
