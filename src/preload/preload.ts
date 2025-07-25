import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { ElectronAPI, Chat, ExportFormat, Draft, ApiResponse } from '../types';

console.log('preload.ts loaded');

// Валидация и санитизация данных
const sanitize = {
  string: (value: any): string => {
    if (typeof value !== 'string') return '';
    return value.slice(0, 10000); // Ограничение длины строки
  },
  object: (value: any): any => {
    if (typeof value !== 'object' || value === null) return {};
    // Глубокое клонирование для безопасности
    return JSON.parse(JSON.stringify(value));
  }
};

// Создание безопасного API для renderer процесса
const electronAPI: ElectronAPI = {
  // Основные функции хранилища
  saveData: async (key: string, data: any): Promise<boolean> => {
    console.log('saveData called with key:', key);
    return ipcRenderer.invoke('save-data', sanitize.string(key), sanitize.object(data));
  },
  
  loadData: async (key: string): Promise<any> => {
    return ipcRenderer.invoke('load-data', sanitize.string(key));
  },
  
  deleteData: async (key: string): Promise<boolean> => {
    return ipcRenderer.invoke('delete-data', sanitize.string(key));
  },
  
  // Безопасная работа с API ключом
  saveApiKey: async (apiKey: string): Promise<boolean> => {
    return ipcRenderer.invoke('save-api-key', sanitize.string(apiKey));
  },
  
  getApiKey: async (): Promise<string | null> => {
    return ipcRenderer.invoke('get-api-key');
  },
  
  // Работа с черновиками
  saveDraft: async (chatId: string | number, draft: string): Promise<boolean> => {
    return ipcRenderer.invoke('save-draft', chatId, sanitize.string(draft));
  },
  
  getDraft: async (chatId: string | number): Promise<Draft | null> => {
    return ipcRenderer.invoke('get-draft', chatId);
  },
  
  clearDraft: async (chatId: string | number): Promise<boolean> => {
    return ipcRenderer.invoke('clear-draft', chatId);
  },
  
  // Отправка сообщений
  sendMessage: async (payload: any): Promise<ApiResponse> => {
    return ipcRenderer.invoke('send-message', sanitize.object(payload));
  },
  
  // Продвинутый экспорт
  exportChatAdvanced: async (chat: Chat, format: ExportFormat) => {
    return ipcRenderer.invoke('export-chat-advanced', sanitize.object(chat), format);
  },
  
  // События от главного процесса
  onNewChat: (callback: () => void) => {
    const listener = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('new-chat', listener);
  },
  
  onExportChat: (callback: () => void) => {
    const listener = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('export-chat', listener);
  },
  
  onThemeChanged: (callback: (event: IpcRendererEvent, isDarkMode: boolean) => void) => {
    ipcRenderer.on('theme-changed', callback);
  },
  
  // Удаление слушателей
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
};

// Экспонируем API в глобальный контекст
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Логирование для отладки
console.log('Electron API exposed to renderer');