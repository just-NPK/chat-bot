import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import '../assets/styles/main.css';

// Настройка marked
if (typeof window.marked !== 'undefined') {
  window.marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: true,
    langPrefix: 'language-',
    smartLists: true,
    smartypants: true
  });
}

// Проверка зависимостей
const checkDependencies = (): boolean => {
  const deps = {
    'React': typeof React !== 'undefined',
    'ReactDOM': typeof ReactDOM !== 'undefined',
    'marked': typeof window.marked !== 'undefined',
    'DOMPurify': typeof window.DOMPurify !== 'undefined',
    'hljs': typeof window.hljs !== 'undefined',
    'electronAPI': typeof window.electronAPI !== 'undefined'
  };
  
  const missing = Object.entries(deps)
    .filter(([_, loaded]) => !loaded)
    .map(([name]) => name);
  
  if (missing.length > 0) {
    console.error('Missing dependencies:', missing);
    return false;
  }
  
  return true;
};

// Инициализация приложения
const initApp = () => {
  if (!checkDependencies()) {
    setTimeout(initApp, 100);
    return;
  }
  
  console.log('All dependencies loaded, starting app');
  
  const root = document.getElementById('root');
  if (!root) {
    console.error('Root element not found');
    return;
  }
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Запуск при загрузке DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}