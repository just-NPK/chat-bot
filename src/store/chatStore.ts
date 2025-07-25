import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Chat, Message, ModelSettings } from '../types';

interface ChatStore {
  // State
  chats: Chat[];
  activeChat: number;
  isDarkMode: boolean;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  showApiKeyModal: boolean;
  showSettingsModal: boolean;
  isSidebarCollapsed: boolean;
  settings: ModelSettings;
  
  // Actions
  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (index: number, updates: Partial<Chat>) => void;
  deleteChat: (index: number) => void;
  setActiveChat: (index: number) => void;
  
  addMessage: (chatIndex: number, message: Message) => void;
  updateMessage: (chatIndex: number, messageIndex: number, content: string) => void;
  
  setDarkMode: (isDark: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  
  setShowApiKeyModal: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  setSettings: (settings: ModelSettings) => void;
  updateSettings: (updates: Partial<ModelSettings>) => void;
  
  // Computed
  getFilteredChats: () => Chat[];
  getCurrentChat: () => Chat | undefined;
}

export const useChatStore = create<ChatStore>()(
  immer((set, get) => ({
    // Initial state
    chats: [{ id: Date.now(), name: 'Новый чат', messages: [], createdAt: Date.now() }],
    activeChat: 0,
    isDarkMode: false,
    isLoading: false,
    error: null,
    searchQuery: '',
    showApiKeyModal: false,
    showSettingsModal: false,
    isSidebarCollapsed: false,
    settings: {
      model: 'Hermes-3-Llama-3.1-70B',
      temperature: 0.7,
      maxTokens: 2000,
      topP: 0.9,
      systemPrompt: ''
    },
    
    // Actions
    setChats: (chats) => set((state) => {
      state.chats = chats;
    }),
    
    addChat: (chat) => set((state) => {
      state.chats.push(chat);
      state.activeChat = state.chats.length - 1;
    }),
    
    updateChat: (index, updates) => set((state) => {
      if (state.chats[index]) {
        Object.assign(state.chats[index], updates);
        state.chats[index].updatedAt = Date.now();
      }
    }),
    
    deleteChat: (index) => set((state) => {
      if (state.chats.length > 1) {
        state.chats.splice(index, 1);
        if (state.activeChat >= state.chats.length) {
          state.activeChat = state.chats.length - 1;
        }
      }
    }),
    
    setActiveChat: (index) => set((state) => {
      state.activeChat = index;
    }),
    
    addMessage: (chatIndex, message) => set((state) => {
      if (state.chats[chatIndex]) {
        state.chats[chatIndex].messages.push({
          ...message,
          timestamp: Date.now(),
          id: `${Date.now()}-${Math.random()}`
        });
        state.chats[chatIndex].updatedAt = Date.now();
        
        // Update chat name after first message
        if (state.chats[chatIndex].messages.length === 1 && message.role === 'user') {
          const name = message.content.slice(0, 50);
          state.chats[chatIndex].name = name + (message.content.length > 50 ? '...' : '');
        }
      }
    }),
    
    updateMessage: (chatIndex, messageIndex, content) => set((state) => {
      if (state.chats[chatIndex]?.messages[messageIndex]) {
        state.chats[chatIndex].messages[messageIndex].content = content;
      }
    }),
    
    setDarkMode: (isDark) => set((state) => {
      state.isDarkMode = isDark;
    }),
    
    setLoading: (loading) => set((state) => {
      state.isLoading = loading;
    }),
    
    setError: (error) => set((state) => {
      state.error = error;
    }),
    
    setSearchQuery: (query) => set((state) => {
      state.searchQuery = query;
    }),
    
    setShowApiKeyModal: (show) => set((state) => {
      state.showApiKeyModal = show;
    }),
    
    setShowSettingsModal: (show) => set((state) => {
      state.showSettingsModal = show;
    }),
    
    setSidebarCollapsed: (collapsed) => set((state) => {
      state.isSidebarCollapsed = collapsed;
    }),
    
    setSettings: (settings) => set((state) => {
      state.settings = settings;
    }),
    
    updateSettings: (updates) => set((state) => {
      Object.assign(state.settings, updates);
    }),
    
    // Computed
    getFilteredChats: () => {
      const state = get();
      if (!state.searchQuery) return state.chats;
      
      const query = state.searchQuery.toLowerCase();
      return state.chats.filter(chat => {
        if (chat.name.toLowerCase().includes(query)) return true;
        return chat.messages.some(msg => 
          msg.content.toLowerCase().includes(query)
        );
      });
    },
    
    getCurrentChat: () => {
      const state = get();
      return state.chats[state.activeChat];
    }
  }))
);

// Persistence middleware
export const persistChatStore = () => {
  const store = useChatStore.getState();
  
  // Subscribe to changes
  useChatStore.subscribe((state) => {
    // Save chats
    window.electronAPI.saveData('chats', state.chats).catch(console.error);
    
    // Save settings
    window.electronAPI.saveData('modelSettings', state.settings).catch(console.error);
    
    // Save UI preferences
    window.electronAPI.saveData('uiPreferences', {
      isDarkMode: state.isDarkMode,
      isSidebarCollapsed: state.isSidebarCollapsed
    }).catch(console.error);
  });
  
  // Load initial data
  const loadInitialData = async () => {
    try {
      const [chats, settings, uiPrefs] = await Promise.all([
        window.electronAPI.loadData('chats'),
        window.electronAPI.loadData('modelSettings'),
        window.electronAPI.loadData('uiPreferences')
      ]);
      
      if (chats?.length > 0) {
        store.setChats(chats);
      }
      
      if (settings) {
        store.setSettings(settings);
      }
      
      if (uiPrefs) {
        store.setDarkMode(uiPrefs.isDarkMode);
        store.setSidebarCollapsed(uiPrefs.isSidebarCollapsed);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };
  
  return loadInitialData();
};