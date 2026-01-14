import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/') {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export const auth = {
  register: (data: { email: string; password: string; name: string; role?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const documents = {
  list: () => api.get('/documents'),
  get: (id: string) => api.get(`/documents/${id}`),
  create: (data: { title: string; content?: any; templateType?: string }) =>
    api.post('/documents', data),
  update: (id: string, data: { title?: string; content?: any; language?: string; status?: string }) =>
    api.patch(`/documents/${id}`, data),
  delete: (id: string) => api.delete(`/documents/${id}`),
  addCollaborator: (id: string, data: { userId: string; permission: string }) =>
    api.post(`/documents/${id}/collaborators`, data),
  removeCollaborator: (id: string, userId: string) =>
    api.delete(`/documents/${id}/collaborators/${userId}`),
  getVersions: (id: string) => api.get(`/documents/${id}/versions`),
};

export const questionnaire = {
  getTemplates: () => api.get('/questionnaire/templates'),
  getTemplate: (id: string) => api.get(`/questionnaire/templates/${id}`),
  getFields: (id: string) => api.get(`/questionnaire/templates/${id}/fields`),
  fillTemplate: (id: string, answers: Record<string, string>) =>
    api.post(`/questionnaire/templates/${id}/fill`, { answers }),
  processSectionVoice: (id: string, sectionName: string, audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    return api.post(
      `/questionnaire/templates/${id}/sections/${encodeURIComponent(sectionName)}/voice`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
  },
};

export const stt = {
  transcribe: (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    return api.post('/stt/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const translation = {
  getLanguages: () => api.get('/translation/languages'),
  translate: (text: string, targetLanguage: string, sourceLanguage?: string) =>
    api.post('/translation/translate', { text, targetLanguage, sourceLanguage }),
  translateDocument: (documentId: string, targetLanguage: string) =>
    api.post(`/translation/documents/${documentId}`, { targetLanguage }),
};

export const compliance = {
  analyze: (documentId: string, options?: { providerCountry?: string; getterCountry?: string }) =>
    api.post(`/compliance/documents/${documentId}/analyze`, options || {}),
  analyzeEU: (documentId: string, providerCountry?: string, getterCountry?: string) =>
    api.post('/compliance/eu/analyze', { documentId, providerCountry, getterCountry }),
  getReports: (documentId: string) =>
    api.get(`/compliance/documents/${documentId}/reports`),
  getLatest: (documentId: string) =>
    api.get(`/compliance/documents/${documentId}/latest`),
  getRules: () => api.get('/compliance/rules'),
  getEURules: () => api.get('/compliance/eu/rules'),
  getEUCountries: () => api.get('/compliance/eu/countries'),
  getNegotiationAdvice: (clause: string, concern: string) =>
    api.post('/compliance/negotiate', { clause, concern }),
  getAIStatus: () => api.get('/compliance/ai/status'),
};

export const shareLinks = {
  create: (documentId: string, expiresInDays?: number, targetLanguage?: string) =>
    api.post(`/documents/${documentId}/share`, { expiresInDays, targetLanguage }),
  list: (documentId: string) =>
    api.get(`/documents/${documentId}/shares`),
  revoke: (token: string) =>
    api.delete(`/shares/${token}`),
  getShared: (token: string, lang?: string) =>
    axios.get(`${API_BASE_URL}/shared/${token}`, { params: lang ? { lang } : {} }),
  explainShared: (token: string, clause: string, language?: string) =>
    axios.post(`${API_BASE_URL}/shared/${token}/explain`, { clause, language }),
};

export const comments = {
  list: (documentId: string, sectionId?: string) =>
    api.get(`/documents/${documentId}/comments`, { params: { sectionId } }),
  getThreads: (documentId: string) =>
    api.get(`/documents/${documentId}/comments/threads`),
  create: (documentId: string, data: { content: string; sectionId?: string; type?: 'note' | 'comment'; parentId?: string }) =>
    api.post(`/documents/${documentId}/comments`, data),
  update: (commentId: string, data: { content?: string; resolved?: boolean }) =>
    api.patch(`/comments/${commentId}`, data),
  resolve: (commentId: string) =>
    api.post(`/comments/${commentId}/resolve`),
  delete: (commentId: string) =>
    api.delete(`/comments/${commentId}`),
};

export const summarization = {
  summarize: (text: string, language?: string) =>
    api.post('/summarize', { text, language }),
  explain: (clause: string, language?: string) =>
    api.post('/summarize/explain', { clause, language }),
  keyTerms: (text: string) =>
    api.post('/summarize/key-terms', { text }),
};

export const docusign = {
  getAuthUrl: (redirectUri: string, state: string) =>
    api.get('/docusign/auth', { params: { redirectUri, state } }),
  exchangeToken: (code: string, redirectUri: string) =>
    api.post('/docusign/token', { code, redirectUri }),
  createEnvelope: (documentId: string, signers: { email: string; name: string; order: number }[], token: string) =>
    api.post('/docusign/envelopes', { documentId, signers }, {
      headers: { 'x-docusign-token': token },
    }),
  getSigningUrl: (envelopeId: string, signerEmail: string, signerName: string, returnUrl: string, token: string) =>
    api.post(`/docusign/envelopes/${envelopeId}/signing-url`, {
      signerEmail, signerName, returnUrl,
    }, {
      headers: { 'x-docusign-token': token },
    }),
  getSignatureRequests: (documentId: string) =>
    api.get(`/docusign/documents/${documentId}/signatures`),
};

export default api;
