import React, { useEffect, useRef, memo } from 'react';
import type { Message } from '../types';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isDarkMode: boolean;
}

interface MessageItemProps {
  message: Message;
  isDarkMode: boolean;
  onCopy: (content: string) => void;
}

const MessageItem = memo(({ message, isDarkMode, onCopy }: MessageItemProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Подсветка кода
    if (contentRef.current && typeof window.hljs !== 'undefined') {
      contentRef.current.querySelectorAll('pre code').forEach((block) => {
        window.hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [message.content]);
  
  const renderContent = () => {
    if (message.role === 'user') {
      return (
        <div className="whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>
      );
    }
    
    // Markdown для ассистента
    const rawHtml = window.marked.parse(message.content);
    const sanitizedHtml = window.DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                     'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'table', 
                     'thead', 'tbody', 'tr', 'td', 'th', 'hr', 'sup', 'sub', 'del', 'ins'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel']
    });
    
    return (
      <div
        ref={contentRef}
        className="markdown-content leading-relaxed"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  };
  
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`max-w-[70%] p-4 rounded-lg shadow-sm transition-all ${
        message.role === 'user'
          ? 'bg-blue-500 text-white'
          : isDarkMode 
            ? 'bg-gray-800 text-gray-100 border border-gray-700'
            : 'bg-white text-gray-900 border border-gray-200'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {renderContent()}
          </div>
          <button
            onClick={() => onCopy(message.content)}
            className={`flex-shrink-0 p-1.5 rounded-md transition-colors ${
              message.role === 'user'
                ? 'hover:bg-white hover:bg-opacity-20'
                : isDarkMode
                  ? 'hover:bg-gray-700'
                  : 'hover:bg-gray-100'
            }`}
            title="Копировать"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
        {message.timestamp && (
          <div className={`text-xs mt-2 ${
            message.role === 'user'
              ? 'text-blue-100'
              : isDarkMode
                ? 'text-gray-500'
                : 'text-gray-400'
          }`}>
            {new Date(message.timestamp).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

const LoadingIndicator: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => (
  <div className="flex justify-start animate-fade-in">
    <div className={`p-4 rounded-lg shadow-sm ${
      isDarkMode 
        ? 'bg-gray-800 border border-gray-700' 
        : 'bg-white border border-gray-200'
    }`}>
      <div className="flex space-x-1">
        <div className={`w-2 h-2 rounded-full animate-pulse-dot ${
          isDarkMode ? 'bg-gray-500' : 'bg-gray-400'
        }`} />
        <div className={`w-2 h-2 rounded-full animate-pulse-dot ${
          isDarkMode ? 'bg-gray-500' : 'bg-gray-400'
        }`} style={{ animationDelay: '0.2s' }} />
        <div className={`w-2 h-2 rounded-full animate-pulse-dot ${
          isDarkMode ? 'bg-gray-500' : 'bg-gray-400'
        }`} style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  </div>
);

export const MessageList: React.FC<MessageListProps> = memo(({ 
  messages, 
  isLoading, 
  isDarkMode 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Можно добавить toast уведомление
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };
  
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className={`text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <p className="text-lg font-medium">Начните новую беседу</p>
          <p className="text-sm mt-1">Введите сообщение внизу, чтобы начать</p>
        </div>
      </div>
    );
  }
  
  return (
    <div ref={containerRef} className="h-full overflow-y-auto px-6 py-4 space-y-4">
      {messages.map((message, index) => (
        <MessageItem
          key={message.id || index}
          message={message}
          isDarkMode={isDarkMode}
          onCopy={copyToClipboard}
        />
      ))}
      {isLoading && <LoadingIndicator isDarkMode={isDarkMode} />}
      <div ref={messagesEndRef} />
    </div>
  );
});

MessageList.displayName = 'MessageList';

export default MessageList;