import { Module } from '@nestjs/common';
import { SttService } from './stt.service';
import { SttController } from './stt.controller';

@Module({
  controllers: [SttController],
  providers: [SttService],
  exports: [SttService],
})
export class SttModule {}
