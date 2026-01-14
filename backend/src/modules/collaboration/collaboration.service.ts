import { Injectable } from '@nestjs/common';
import { DocumentsService } from '../documents/documents.service';

export interface DocumentRoom {
  documentId: string;
  users: Map<string, ConnectedUser>;
}

export interface ConnectedUser {
  id: string;
  name: string;
  avatarUrl?: string;
  socketId: string;
  cursorPosition?: CursorPosition;
}

export interface CursorPosition {
  from: number;
  to: number;
}

export interface DocumentOperation {
  type: 'insert' | 'delete' | 'replace';
  position: number;
  content?: string;
  length?: number;
  userId: string;
  timestamp: number;
}

@Injectable()
export class CollaborationService {
  private rooms: Map<string, DocumentRoom> = new Map();

  constructor(private documentsService: DocumentsService) {}

  joinRoom(documentId: string, user: ConnectedUser): ConnectedUser[] {
    let room = this.rooms.get(documentId);
    
    if (!room) {
      room = {
        documentId,
        users: new Map(),
      };
      this.rooms.set(documentId, room);
    }

    room.users.set(user.id, user);
    return Array.from(room.users.values());
  }

  leaveRoom(documentId: string, userId: string): ConnectedUser[] {
    const room = this.rooms.get(documentId);
    if (!room) return [];

    room.users.delete(userId);

    if (room.users.size === 0) {
      this.rooms.delete(documentId);
      return [];
    }

    return Array.from(room.users.values());
  }

  updateCursor(documentId: string, userId: string, position: CursorPosition): void {
    const room = this.rooms.get(documentId);
    if (!room) return;

    const user = room.users.get(userId);
    if (user) {
      user.cursorPosition = position;
    }
  }

  getUsers(documentId: string): ConnectedUser[] {
    const room = this.rooms.get(documentId);
    if (!room) return [];
    return Array.from(room.users.values());
  }

  getUserBySocketId(socketId: string): { documentId: string; user: ConnectedUser } | null {
    for (const [documentId, room] of this.rooms.entries()) {
      for (const user of room.users.values()) {
        if (user.socketId === socketId) {
          return { documentId, user };
        }
      }
    }
    return null;
  }

  async applyOperation(documentId: string, userId: string, operation: DocumentOperation) {
    return operation;
  }

  async saveDocument(documentId: string, userId: string, content: any) {
    return this.documentsService.update(documentId, userId, { content });
  }
}
