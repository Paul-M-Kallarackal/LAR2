import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { QuestionnaireModule } from './modules/questionnaire/questionnaire.module';
import { SttModule } from './modules/stt/stt.module';
import { TranslationModule } from './modules/translation/translation.module';
import { DocusignModule } from './modules/docusign/docusign.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { ShareLinksModule } from './modules/share-links/share-links.module';
import { CommentsModule } from './modules/comments/comments.module';
import { SummarizationModule } from './modules/summarization/summarization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USERNAME', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'postgres'),
        database: configService.get('DATABASE_NAME', 'lma_automate'),
        entities: [__dirname + '/database/entities/*.entity{.ts,.js}'],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    DocumentsModule,
    QuestionnaireModule,
    SttModule,
    TranslationModule,
    DocusignModule,
    ComplianceModule,
    CollaborationModule,
    ShareLinksModule,
    CommentsModule,
    SummarizationModule,
  ],
})
export class AppModule {}
