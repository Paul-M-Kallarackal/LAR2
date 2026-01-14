import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Document } from './document.entity';

@Entity('share_links')
export class ShareLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  documentId: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column({ unique: true })
  token: string;

  @Column()
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({ nullable: true })
  accessedBy: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'accessedBy' })
  accessor: User;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ default: 0 })
  accessCount: number;

  @Column({ default: 'en' })
  targetLanguage: string;

  @CreateDateColumn()
  createdAt: Date;
}
