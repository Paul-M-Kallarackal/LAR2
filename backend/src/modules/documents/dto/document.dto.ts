import { IsString, IsOptional, IsEnum, IsObject, IsUUID } from 'class-validator';
import { Permission } from '../../../database/entities/collaborator.entity';

export class CreateDocumentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsObject()
  content?: any;

  @IsOptional()
  @IsString()
  templateType?: string;

  @IsOptional()
  @IsString()
  language?: string;
}

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  content?: any;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class AddCollaboratorDto {
  @IsUUID()
  userId: string;

  @IsEnum(Permission)
  permission: Permission;
}
