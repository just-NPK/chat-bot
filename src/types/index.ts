// Основные типы для приложения

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  id?: string;
}

export interface Chat {
  id: number | string;
  name: string;
  messages: Message[];
  createdAt?: number;
  updatedAt?: number;
  metadata?: Record<string, any>;
}

export interface ModelSettings {
  model: ModelType;
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt: string;
  stream?: boolean;
}

export type ModelType = 
  | 'Hermes-3-Llama-3.1-70B'
  | 'Hermes-3-Llama-3.1-405B'
  | 'DeepHermes-3-Llama-3-8B-Preview'
  | 'DeepHermes-3-Mistral-24B-Preview';

export interface Draft {
  content: string;
  timestamp: number;
}

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
}

export type ExportFormat = 'txt' | 'markdown' | 'json' | 'pdf' | 'docx' | 'html';

export interface ApiResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AppState {
  chats: Chat[];
  activeChat: number;
  isDarkMode: boolean;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
}

// Добавляем недостающие типы для плагинов
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  config?: Record<string, any>;
}

// Добавляем типы для статистики
export interface ChatStatistics {
  totalChats: number;
  totalMessages: number;
  messagesByRole: Record<string, number>;
  averageMessagesPerChat: number;
  averageMessageLength: number;
  totalTokens: number;
  estimatedCost: number;
  mostActiveHours: Record<number, number>;
  mostActiveWeekdays: Record<string, number>;
  topWords: Array<{ word: string; count: number }>;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  responseTime: {
    average: number;
    min: number;
    max: number;
  };
}

export interface ElectronAPI {
  saveData: (key: string, data: any) => Promise<boolean>;
  loadData: (key: string) => Promise<any>;
  deleteData: (key: string) => Promise<boolean>;
  saveApiKey: (apiKey: string) => Promise<boolean>;
  getApiKey: () => Promise<string | null>;
  saveDraft: (chatId: string | number, draft: string) => Promise<boolean>;
  getDraft: (chatId: string | number) => Promise<Draft | null>;
  clearDraft: (chatId: string | number) => Promise<boolean>;
  sendMessage: (payload: any) => Promise<ApiResponse>;
  exportChatAdvanced: (chat: Chat, format: ExportFormat) => Promise<{ success: boolean; path?: string; error?: string }>;
  onNewChat: (callback: () => void) => void;
  onExportChat: (callback: () => void) => void;
  onThemeChanged: (callback: (event: any, isDarkMode: boolean) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    marked: any;
    DOMPurify: any;
    hljs: any;
  }
}

export {};