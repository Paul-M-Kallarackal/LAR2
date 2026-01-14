import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Document } from './document.entity';
import { Collaborator } from './collaborator.entity';

export enum UserRole {
  PROVIDER = 'provider',
  BORROWER = 'borrower',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.BORROWER })
  role: UserRole;

  @Column({ nullable: true })
  avatarUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Document, document => document.owner)
  documents: Document[];

  @OneToMany(() => Collaborator, collaborator => collaborator.user)
  collaborations: Collaborator[];
}
