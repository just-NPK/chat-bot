import React, { useRef, useState, useCallback } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  isDarkMode: boolean;
  placeholder?: string;
}

type FormatType = 'bold' | 'italic' | 'code' | 'quote' | 'link' | 'heading' | 'list' | 'numbered-list';

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  onSend,
  isLoading,
  isDarkMode,
  placeholder = 'Введите сообщение...'
}) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [showFormatting, setShowFormatting] = useState(false);
  
  // Форматирование текста
  const formatText = useCallback((format: FormatType) => {
    const textarea = editorRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value;
    const selectedText = text.substring(start, end);
    
    let newText = '';
    let newCursorPos = start;
    
    switch (format) {
      case 'bold':
        newText = text.substring(0, start) + `**${selectedText}**` + text.substring(end);
        newCursorPos = end + 4;
        break;
      case 'italic':
        newText = text.substring(0, start) + `*${selectedText}*` + text.substring(end);
        newCursorPos = end + 2;
        break;
      case 'code':
        if (selectedText.includes('\n')) {
          newText = text.substring(0, start) + '```\n' + selectedText + '\n```' + text.substring(end);
          newCursorPos = start + 4;
        } else {
          newText = text.substring(0, start) + '`' + selectedText + '`' + text.substring(end);
          newCursorPos = end + 2;
        }
        break;
      case 'quote':
        const lines = selectedText.split('\n').map(line => '> ' + line).join('\n');
        newText = text.substring(0, start) + lines + text.substring(end);
        newCursorPos = end + 2;
        break;
      case 'link':
        newText = text.substring(0, start) + `[${selectedText}](url)` + text.substring(end);
        newCursorPos = end + 3;
        break;
      case 'heading':
        newText = text.substring(0, start) + '## ' + selectedText + text.substring(end);
        newCursorPos = start + 3;
        break;
      case 'list':
        const listLines = selectedText.split('\n').map(line => '- ' + line).join('\n');
        newText = text.substring(0, start) + listLines + text.substring(end);
        newCursorPos = start + 2;
        break;
      case 'numbered-list':
        const numberedLines = selectedText.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n');
        newText = text.substring(0, start) + numberedLines + text.substring(end);
        newCursorPos = start + 3;
        break;
    }
    
    onChange(newText);
    
    // Восстанавливаем позицию курсора
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange]);
  
  // Обработка горячих клавиш
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          formatText('bold');
          break;
        case 'i':
          e.preventDefault();
          formatText('italic');
          break;
        case 'k':
          e.preventDefault();
          formatText('link');
          break;
        case 'Enter':
          e.preventDefault();
          onSend();
          break;
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };
  
  const FormattingButton: React.FC<{
    icon: React.ReactNode;
    title: string;
    action: FormatType;
    shortcut?: string;
  }> = ({ icon, title, action, shortcut }) => {
    return (
      <button
        onClick={() => formatText(action)}
        className={`p-1.5 rounded transition-colors ${
          isDarkMode 
            ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
            : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
        }`}
        title={shortcut ? `${title} (${shortcut})` : title}
        type="button"
      >
        {icon}
      </button>
    );
  };
  
  return (
    <div className="flex flex-col space-y-2">
      {/* Панель форматирования */}
      {showFormatting && (
        <div className={`flex items-center space-x-1 p-2 rounded-lg border ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <FormattingButton
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13.5 22C13.5 22 13.5 16.5 13.5 12.5C13.5 12.5 17 12.5 17 12.5C18.6 12.5 20 11.1 20 9.5C20 7.9 18.7 6.5 17 6.5C17 6.5 13.5 6.5 13.5 6.5C13.5 6.5 13.5 2 13.5 2C13.5 2 10.5 2 10.5 2C10.5 2 10.5 6.5 10.5 6.5C10.5 6.5 7 6.5 7 6.5C5.3 6.5 4 7.9 4 9.5C4 11.1 5.3 12.5 7 12.5C7 12.5 10.5 12.5 10.5 12.5C10.5 16.5 10.5 22 10.5 22C10.5 22 13.5 22 13.5 22" />
              </svg>
            }
            title="Жирный"
            action="bold"
            shortcut="Ctrl+B"
          />
          <FormattingButton
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 4V7C10 13.1 10 16 10 16C10 17.1 10.9 18 12 18C13.1 18 14 17.1 14 16C14 16 14 13.1 14 7V4H10M5 7L7 20H9L11 7H9L8 14L7 7H5Z" />
              </svg>
            }
            title="Курсив"
            action="italic"
            shortcut="Ctrl+I"
          />
          <FormattingButton
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
              </svg>
            }
            title="Код"
            action="code"
          />
          <FormattingButton
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 17h3l2-4V7H5v6h3M14 17h3l2-4V7h-6v6h3" />
              </svg>
            }
            title="Цитата"
            action="quote"
          />
          <FormattingButton
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
              </svg>
            }
            title="Ссылка"
            action="link"
            shortcut="Ctrl+K"
          />
          <div className={`w-px h-4 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
          <FormattingButton
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
              </svg>
            }
            title="Список"
            action="list"
          />
          <FormattingButton
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" />
              </svg>
            }
            title="Нумерованный список"
            action="numbered-list"
          />
          <FormattingButton
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 4v3h5.5v12h3V7H19V4z" />
              </svg>
            }
            title="Заголовок"
            action="heading"
          />
        </div>
      )}
      
      {/* Область ввода */}
      <div className="relative">
        <textarea
          ref={editorRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowFormatting(true)}
          placeholder={placeholder}
          className={`w-full p-3 rounded-lg resize-none transition-colors ${
            isDarkMode 
              ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-500' 
              : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
          } border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
          rows={4}
          disabled={isLoading}
        />
        
        {/* Индикатор горячих клавиш */}
        <div className={`absolute bottom-2 right-2 text-xs ${
          isDarkMode ? 'text-gray-500' : 'text-gray-400'
        }`}>
          <span>Enter - отправить • Shift+Enter - новая строка</span>
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;