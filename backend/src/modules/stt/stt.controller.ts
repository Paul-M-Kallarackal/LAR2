import { Controller, Post, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SttService } from './stt.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('stt')
@UseGuards(JwtAuthGuard)
export class SttController {
  constructor(private sttService: SttService) {}

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribe(@UploadedFile() file: Express.Multer.File) {
    const result = await this.sttService.transcribe(file.buffer, file.mimetype);
    return result;
  }

  @Post('detect-language')
  @UseInterceptors(FileInterceptor('audio'))
  async detectLanguage(@UploadedFile() file: Express.Multer.File) {
    const language = await this.sttService.detectLanguage(file.buffer, file.mimetype);
    return { language };
  }
}
