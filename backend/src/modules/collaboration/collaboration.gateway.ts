import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CollaborationService, CursorPosition, DocumentOperation } from './collaboration.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private collaborationService: CollaborationService,
  ) {}

  async handleConnection(client: Socket) {
    client.data.userId = client.handshake.auth.userId || `demo-user-${client.id}`;
    client.data.userEmail = client.handshake.auth.userEmail || 'demo@example.com';
  }

  handleDisconnect(client: Socket) {
    const result = this.collaborationService.getUserBySocketId(client.id);
    if (result) {
      const users = this.collaborationService.leaveRoom(result.documentId, result.user.id);
      this.server.to(result.documentId).emit('presence:update', { users });
    }
  }

  @SubscribeMessage('doc:join')
  handleJoinDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string; userName: string; avatarUrl?: string },
  ) {
    const userId = client.data.userId || `demo-user-${client.id}`;
    
    client.join(data.documentId);

    const users = this.collaborationService.joinRoom(data.documentId, {
      id: userId,
      name: data.userName,
      avatarUrl: data.avatarUrl,
      socketId: client.id,
    });

    this.server.to(data.documentId).emit('presence:update', { users });
    client.emit('doc:joined', { documentId: data.documentId, users });
  }

  @SubscribeMessage('doc:leave')
  handleLeaveDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string },
  ) {
    const userId = client.data.userId || `demo-user-${client.id}`;

    client.leave(data.documentId);
    const users = this.collaborationService.leaveRoom(data.documentId, userId);
    this.server.to(data.documentId).emit('presence:update', { users });
  }

  @SubscribeMessage('doc:update')
  handleDocumentUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string; operations: DocumentOperation[] },
  ) {
    const userId = client.data.userId || `demo-user-${client.id}`;

    client.to(data.documentId).emit('doc:update', {
      userId,
      operations: data.operations,
    });
  }

  @SubscribeMessage('doc:content')
  async handleDocumentContent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string; content: any },
  ) {
    const userId = client.data.userId || `demo-user-${client.id}`;

    client.to(data.documentId).emit('doc:content', {
      userId,
      content: data.content,
    });
  }

  @SubscribeMessage('doc:save')
  async handleDocumentSave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string; content: any },
  ) {
    const userId = client.data.userId || `demo-user-${client.id}`;

    await this.collaborationService.saveDocument(data.documentId, userId, data.content);
    this.server.to(data.documentId).emit('doc:saved', { documentId: data.documentId });
  }

  @SubscribeMessage('cursor:move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string; position: CursorPosition },
  ) {
    const userId = client.data.userId || `demo-user-${client.id}`;

    this.collaborationService.updateCursor(data.documentId, userId, data.position);

    client.to(data.documentId).emit('cursor:move', {
      userId,
      position: data.position,
    });
  }
}
