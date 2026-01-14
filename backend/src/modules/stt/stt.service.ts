import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface TranscriptionResult {
  text: string;
  language: string;
  duration?: number;
}

@Injectable()
export class SttService {
  private openai: OpenAI | null = null;

  constructor(private configService: ConfigService) {
    // #region agent log
    const apiKey = this.configService.get('OPENAI_API_KEY');
    fetch('http://127.0.0.1:7242/ingest/e3447f5f-d16a-47ce-acd7-a23ba1d8f2f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'stt.service.ts:constructor',message:'OpenAI API key check',data:{hasKey:!!apiKey,keyLength:apiKey?.length||0,keyPreview:apiKey?apiKey.substring(0,8)+'...':'MISSING'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H3'})}).catch(()=>{});
    // #endregion
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e3447f5f-d16a-47ce-acd7-a23ba1d8f2f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'stt.service.ts:constructor',message:'OpenAI client initialized',data:{success:true},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e3447f5f-d16a-47ce-acd7-a23ba1d8f2f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'stt.service.ts:constructor',message:'OpenAI client SKIPPED - no API key',data:{sttDisabled:true},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      console.warn('OPENAI_API_KEY not set - STT features will be disabled');
    }
  }

  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<TranscriptionResult> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e3447f5f-d16a-47ce-acd7-a23ba1d8f2f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'stt.service.ts:transcribe',message:'Transcribe called',data:{hasClient:!!this.openai,bufferSize:audioBuffer?.length,mimeType},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    if (!this.openai) {
      throw new Error('STT service unavailable - OPENAI_API_KEY not configured');
    }

    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const extension = this.getExtension(mimeType);
    const tempFile = path.join(tempDir, `${uuidv4()}.${extension}`);
    
    try {
      fs.writeFileSync(tempFile, audioBuffer);

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFile),
        model: 'whisper-1',
        response_format: 'verbose_json',
      });

      return {
        text: transcription.text,
        language: transcription.language || 'en',
        duration: transcription.duration,
      };
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  async detectLanguage(audioBuffer: Buffer, mimeType: string): Promise<string> {
    if (!this.openai) {
      throw new Error('STT service unavailable - OPENAI_API_KEY not configured');
    }
    const result = await this.transcribe(audioBuffer, mimeType);
    return result.language;
  }

  private getExtension(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/wav': 'wav',
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg',
      'audio/flac': 'flac',
      'audio/m4a': 'm4a',
    };
    return mimeMap[mimeType] || 'webm';
  }
}
