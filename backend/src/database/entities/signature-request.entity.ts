import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Document } from './document.entity';

export enum SignatureStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  SIGNED = 'signed',
  COMPLETED = 'completed',
  DECLINED = 'declined',
  VOIDED = 'voided',
}

@Entity('signature_requests')
export class SignatureRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  documentId: string;

  @ManyToOne(() => Document, document => document.signatureRequests)
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column({ nullable: true })
  envelopeId: string;

  @Column({
    type: 'enum',
    enum: SignatureStatus,
    default: SignatureStatus.PENDING,
  })
  status: SignatureStatus;

  @Column('jsonb')
  signers: {
    email: string;
    name: string;
    order: number;
    status: string;
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  completedAt: Date;
}
