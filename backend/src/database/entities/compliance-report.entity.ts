import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Document } from './document.entity';

export enum IssueSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export enum IssueType {
  LMA_COMPLIANCE = 'LMA Compliance',
  FAIRNESS = 'Fairness',
}

export interface ComplianceIssue {
  id: string;
  severity: IssueSeverity;
  category: string;
  message: string;
  location?: string;
  suggestion?: string;
  regulation?: string;
  jurisdiction?: string;
  textMatch?: string;
  startOffset?: number;
  endOffset?: number;
  issueType?: IssueType;
  favoredParty?: 'lender' | 'borrower' | 'neutral';
}

@Entity('compliance_reports')
export class ComplianceReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  documentId: string;

  @ManyToOne(() => Document, document => document.complianceReports)
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column('int')
  score: number;

  @Column('jsonb')
  issues: ComplianceIssue[];

  @CreateDateColumn()
  analyzedAt: Date;
}
