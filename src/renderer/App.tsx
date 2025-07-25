import React, { useEffect, useCallback, Suspense, lazy } from 'react';
import { useChatStore, persistChatStore } from '../store/chatStore';
import { NousApiService } from '../services/api';
import { chatUtils } from '../utils/chatUtils';
import { useDebounce, usePerformanceMonitor } from '../hooks/usePerformance';
import { ChatList } from '../components/ChatList';
import type { Message } from '../types';

// Ленивая загрузка компонентов
const ApiKeyModal = lazy(() => import('../components/ApiKeyModal'));
const SettingsModal = lazy(() => import('../components/SettingsModal'));
const RichTextEditor = lazy(() => import('../components/RichTextEditor'));
const MessageList = lazy(() => import('../components/MessageList'));
const ExportMenu = lazy(() => import('../components/ExportMenu'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center p-4">
    <div className="flex space-x-2">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-100"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200"></div>
    </div>
  </div>
);

export const App: React.FC = () => {
  usePerformanceMonitor('App');
  
  const {
    chats,
    activeChat,
    isDarkMode,
    isLoading,
    searchQuery,
    showApiKeyModal,
    showSettingsModal,
    isSidebarCollapsed,
    settings,
    addChat,
    deleteChat,
    setActiveChat,
    addMessage,
    setLoading,
    setError,
    setSearchQuery,
    setShowApiKeyModal,
    setShowSettingsModal,
    setSidebarCollapsed,
    getCurrentChat
  } = useChatStore();

  const [input, setInput] = React.useState('');
  const [sidebarHeight, setSidebarHeight] = React.useState(window.innerHeight);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const apiService = React.useRef(NousApiService.getInstance());

  // Инициализация
  useEffect(() => {
    const initialize = async () => {
      try {
        // Загружаем сохраненные данные
        await persistChatStore();
        
        // Проверяем API ключ
        const hasApiKey = await window.electronAPI.getApiKey();
        if (!hasApiKey) {
          setShowApiKeyModal(true);
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setError('Ошибка инициализации приложения');
      }
    };
    
    initialize();
  }, []);

  // Обработка изменения темы
  useEffect(() => {
    const handleThemeChange = (_event: any, darkMode: boolean) => {
      useChatStore.getState().setDarkMode(darkMode);
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    window.electronAPI.onThemeChanged(handleThemeChange);
    
    return () => {
      window.electronAPI.removeAllListeners('theme-changed');
    };
  }, []);

  // Обработка событий от главного процесса
  useEffect(() => {
    const handleNewChat = () => {
      const newChat = chatUtils.createNewChat();
      addChat(newChat);
    };
    
    const handleExportChat = () => {
      const currentChat = getCurrentChat();
      if (currentChat) {
        // Открываем меню экспорта
        // Это будет обработано в ExportMenu компоненте
      }
    };

    window.electronAPI.onNewChat(handleNewChat);
    window.electronAPI.onExportChat(handleExportChat);

    return () => {
      window.electronAPI.removeAllListeners('new-chat');
      window.electronAPI.removeAllListeners('export-chat');
    };
  }, [addChat, getCurrentChat]);

  // Автосохранение черновика
  useEffect(() => {
    const currentChat = getCurrentChat();
    if (!currentChat || !input.trim()) return;

    const timeoutId = setTimeout(() => {
      window.electronAPI.saveDraft(currentChat.id, input);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [input, getCurrentChat]);

  // Обработка размера окна
  useEffect(() => {
    const handleResize = () => {
      setSidebarHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Отправка сообщения
  const sendMessage = useCallback(async () => {
    const currentChat = getCurrentChat();
    if (!currentChat || !input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim()
    };

    addMessage(activeChat, userMessage);
    setInput('');
    setLoading(true);

    try {
      await window.electronAPI.clearDraft(currentChat.id);
      
      const response = await apiService.current.sendMessage(
        [...currentChat.messages, userMessage],
        settings
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.choices[0].message.content
      };

      addMessage(activeChat, assistantMessage);
    } catch (error: any) {
      console.error('Send message error:', error);
      
      let errorMessage = 'Произошла ошибка при отправке сообщения';
      if (error.message.includes('API key not found')) {
        errorMessage = 'API ключ не найден';
        setShowApiKeyModal(true);
      } else if (error.message.includes('HTTP error')) {
        errorMessage = `Ошибка сервера: ${error.message}`;
      }

      const errorMsg: Message = {
        role: 'assistant',
        content: errorMessage
      };
      
      addMessage(activeChat, errorMsg);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [input, isLoading, activeChat, settings, getCurrentChat, addMessage, setLoading, setError, setShowApiKeyModal]);

  // Переключение чата с загрузкой черновика
  const switchChat = useCallback(async (index: number) => {
    const currentChat = getCurrentChat();
    if (currentChat && input.trim()) {
      await window.electronAPI.saveDraft(currentChat.id, input);
    }

    setActiveChat(index);

    const newChat = chats[index];
    if (newChat) {
      const draft = await window.electronAPI.getDraft(newChat.id);
      if (draft && draft.content) {
        setInput(draft.content);
      } else {
        setInput('');
      }
    }
  }, [chats, input, getCurrentChat, setActiveChat]);

  const filteredChats = React.useMemo(
    () => chatUtils.searchInChats(chats, debouncedSearchQuery),
    [chats, debouncedSearchQuery]
  );

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Боковая панель */}
      <aside
        className={`${
          isSidebarCollapsed ? 'w-12' : 'w-64'
        } ${
          isDarkMode ? 'bg-gray-800' : 'bg-gray-900'
        } text-white flex flex-col transition-all duration-300 border-r ${
          isDarkMode ? 'border-gray-700' : 'border-gray-800'
        }`}
      >
        <div className="p-2 flex justify-end">
          <button
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            title={isSidebarCollapsed ? 'Развернуть' : 'Свернуть'}
          >
            {isSidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {!isSidebarCollapsed && (
          <>
            <div className="p-4 space-y-3">
              <button
                onClick={() => setSearchQuery(searchQuery ? '' : ' ')}
                className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Поиск</span>
              </button>

              {searchQuery && (
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по чатам..."
                  className="w-full p-2 bg-gray-600 border-gray-500 text-white placeholder-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              )}

              <button
                onClick={() => {
                  const newChat = chatUtils.createNewChat();
                  addChat(newChat);
                }}
                className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Новый чат</span>
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <ChatList
                chats={filteredChats}
                activeChat={activeChat}
                isDarkMode={isDarkMode}
                onChatClick={switchChat}
                onChatDelete={deleteChat}
                height={sidebarHeight - 200}
              />
            </div>

            <div className="p-4 border-t border-gray-700 space-y-2">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
              >
                Настройки модели
              </button>
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
              >
                API ключ
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Основная область */}
      <main className="flex-1 flex flex-col">
        <header className={`px-6 py-4 flex items-center justify-between border-b ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div>
            <h1 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              {getCurrentChat()?.name || 'Nous Chat'}
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Модель: {settings.model}
            </p>
          </div>
          
          <Suspense fallback={<LoadingFallback />}>
            <ExportMenu chat={getCurrentChat()} isDarkMode={isDarkMode} />
          </Suspense>
        </header>

        <div className={`flex-1 overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <Suspense fallback={<LoadingFallback />}>
            <MessageList
              messages={getCurrentChat()?.messages || []}
              isLoading={isLoading}
              isDarkMode={isDarkMode}
            />
          </Suspense>
        </div>

        <footer className={`px-6 py-4 border-t ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Suspense fallback={<LoadingFallback />}>
                <RichTextEditor
                  value={input}
                  onChange={setInput}
                  onSend={sendMessage}
                  isLoading={isLoading}
                  isDarkMode={isDarkMode}
                  placeholder="Введите сообщение... (Поддерживается Markdown)"
                />
              </Suspense>
            </div>
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className={`px-6 py-3 rounded-lg font-medium transition-all self-end ${
                isLoading || !input.trim()
                  ? isDarkMode
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-lg transform hover:scale-105'
              }`}
            >
              {isLoading ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
        </footer>
      </main>

      {/* Модальные окна */}
      <Suspense fallback={null}>
        {showApiKeyModal && <ApiKeyModal />}
        {showSettingsModal && <SettingsModal />}
      </Suspense>
    </div>
  );
};