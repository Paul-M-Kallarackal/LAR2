import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Document } from './document.entity';

export enum Permission {
  VIEW = 'view',
  COMMENT = 'comment',
  EDIT = 'edit',
}

@Entity('collaborators')
export class Collaborator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  documentId: string;

  @ManyToOne(() => Document, document => document.collaborators)
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, user => user.collaborations)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: Permission,
    default: Permission.VIEW,
  })
  permission: Permission;

  @CreateDateColumn()
  joinedAt: Date;
}
