import { create } from 'zustand';
import { documents as documentsApi } from '@/lib/api';

interface Document {
  id: string;
  title: string;
  content: any;
  ownerId: string;
  templateType?: string;
  language: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  collaborators?: Array<{
    id: string;
    userId: string;
    permission: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface DocumentState {
  documents: Document[];
  currentDocument: Document | null;
  isLoading: boolean;
  isSaving: boolean;
  fetchDocuments: () => Promise<void>;
  fetchDocument: (id: string) => Promise<void>;
  createDocument: (data: { title: string; content?: any; templateType?: string }) => Promise<Document>;
  updateDocument: (id: string, data: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  setCurrentDocument: (doc: Document | null) => void;
  updateLocalContent: (content: any) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  currentDocument: null,
  isLoading: false,
  isSaving: false,

  fetchDocuments: async () => {
    set({ isLoading: true });
    try {
      const response = await documentsApi.list();
      set({ documents: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchDocument: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await documentsApi.get(id);
      set({ currentDocument: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createDocument: async (data) => {
    set({ isLoading: true });
    try {
      const response = await documentsApi.create(data);
      const newDoc = response.data;
      set((state) => ({
        documents: [newDoc, ...state.documents],
        isLoading: false,
      }));
      return newDoc;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateDocument: async (id, data) => {
    set({ isSaving: true });
    try {
      const response = await documentsApi.update(id, data);
      set((state) => ({
        documents: state.documents.map((d) => (d.id === id ? response.data : d)),
        currentDocument: state.currentDocument?.id === id ? response.data : state.currentDocument,
        isSaving: false,
      }));
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },

  deleteDocument: async (id) => {
    try {
      await documentsApi.delete(id);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
        currentDocument: state.currentDocument?.id === id ? null : state.currentDocument,
      }));
    } catch (error) {
      throw error;
    }
  },

  setCurrentDocument: (doc) => {
    set({ currentDocument: doc });
  },

  updateLocalContent: (content) => {
    set((state) => ({
      currentDocument: state.currentDocument
        ? { ...state.currentDocument, content }
        : null,
    }));
  },
}));
