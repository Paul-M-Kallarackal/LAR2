import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Collaborator } from './collaborator.entity';
import { DocumentVersion } from './document-version.entity';
import { SignatureRequest } from './signature-request.entity';
import { ComplianceReport } from './compliance-report.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  ownerId: string;

  @ManyToOne(() => User, user => user.documents)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  title: string;

  @Column('jsonb')
  content: any;

  @Column({ nullable: true })
  templateType: string;

  @Column({ default: 'en' })
  language: string;

  @Column({ default: 'draft' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Collaborator, collaborator => collaborator.document)
  collaborators: Collaborator[];

  @OneToMany(() => DocumentVersion, version => version.document)
  versions: DocumentVersion[];

  @OneToMany(() => SignatureRequest, signatureRequest => signatureRequest.document)
  signatureRequests: SignatureRequest[];

  @OneToMany(() => ComplianceReport, report => report.document)
  complianceReports: ComplianceReport[];
}
