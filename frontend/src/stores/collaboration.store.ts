import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface ConnectedUser {
  id: string;
  name: string;
  avatarUrl?: string;
  cursorPosition?: {
    from: number;
    to: number;
  };
}

interface CollaborationState {
  socket: Socket | null;
  connectedUsers: ConnectedUser[];
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  joinDocument: (documentId: string, userName: string, avatarUrl?: string) => void;
  leaveDocument: (documentId: string) => void;
  sendUpdate: (documentId: string, operations: any[]) => void;
  sendContent: (documentId: string, content: any) => void;
  saveDocument: (documentId: string, content: any) => void;
  moveCursor: (documentId: string, position: { from: number; to: number }) => void;
  onUpdate: (callback: (data: { userId: string; operations: any[] }) => void) => void;
  onContent: (callback: (data: { userId: string; content: any }) => void) => void;
  onPresenceUpdate: (callback: (data: { users: ConnectedUser[] }) => void) => void;
  onCursorMove: (callback: (data: { userId: string; position: { from: number; to: number } }) => void) => void;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  socket: null,
  connectedUsers: [],
  isConnected: false,

  connect: () => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false, connectedUsers: [] });
    });

    socket.on('presence:update', ({ users }) => {
      set({ connectedUsers: users });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, connectedUsers: [] });
    }
  },

  joinDocument: (documentId: string, userName: string, avatarUrl?: string) => {
    const { socket } = get();
    if (!socket) {
      get().connect();
    }
    const currentSocket = get().socket;
    if (currentSocket) {
      currentSocket.emit('doc:join', { documentId, userName, avatarUrl });
    }
  },

  leaveDocument: (documentId: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('doc:leave', { documentId });
    }
  },

  sendUpdate: (documentId: string, operations: any[]) => {
    const { socket } = get();
    if (socket) {
      socket.emit('doc:update', { documentId, operations });
    }
  },

  sendContent: (documentId: string, content: any) => {
    const { socket } = get();
    if (socket) {
      socket.emit('doc:content', { documentId, content });
    }
  },

  saveDocument: (documentId: string, content: any) => {
    const { socket } = get();
    if (socket) {
      socket.emit('doc:save', { documentId, content });
    }
  },

  moveCursor: (documentId: string, position: { from: number; to: number }) => {
    const { socket } = get();
    if (socket) {
      socket.emit('cursor:move', { documentId, position });
    }
  },

  onUpdate: (callback) => {
    const { socket } = get();
    if (socket) {
      socket.on('doc:update', callback);
    }
  },

  onContent: (callback) => {
    const { socket } = get();
    if (socket) {
      socket.on('doc:content', callback);
    }
  },

  onPresenceUpdate: (callback) => {
    const { socket } = get();
    if (socket) {
      socket.on('presence:update', callback);
    }
  },

  onCursorMove: (callback) => {
    const { socket } = get();
    if (socket) {
      socket.on('cursor:move', callback);
    }
  },
}));
