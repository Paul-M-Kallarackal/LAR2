import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ComplianceService } from './compliance.service';
import { AIComplianceService } from './ai-compliance.service';
import { ComplianceController } from './compliance.controller';
import { ComplianceReport } from '../../database/entities/compliance-report.entity';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ComplianceReport]),
    DocumentsModule,
    ConfigModule,
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService, AIComplianceService],
  exports: [ComplianceService, AIComplianceService],
})
export class ComplianceModule {}
