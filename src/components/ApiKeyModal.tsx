import React, { useState } from 'react';
import { useChatStore } from '../store/chatStore';

const ApiKeyModal: React.FC = () => {
  const { showApiKeyModal, setShowApiKeyModal, isDarkMode } = useChatStore();
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  if (!showApiKeyModal) return null;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('Пожалуйста, введите API ключ');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Проверяем API ключ
      const testResponse = await fetch('https://inference-api.nousresearch.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'Hermes-3-Llama-3.1-70B',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5
        })
      });
      
      if (!testResponse.ok) {
        throw new Error('Неверный API ключ');
      }
      
      // Сохраняем ключ
      await window.electronAPI.saveApiKey(apiKey.trim());
      setShowApiKeyModal(false);
      setApiKey('');
    } catch (error: any) {
      setError(error.message || 'Ошибка при проверке API ключа');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in`}>
      <div className={`p-6 rounded-lg shadow-xl max-w-md w-full mx-4 animate-slide-in ${
        isDarkMode 
          ? 'bg-gray-800 text-gray-100' 
          : 'bg-white text-gray-900'
      }`}>
        <h2 className="text-xl font-semibold mb-4">Введите API ключ Nous Research</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Ваш API ключ..."
              className={`w-full p-3 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
              } border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              autoFocus
              disabled={isLoading}
            />
            
            {error && (
              <p className="mt-2 text-sm text-red-500">{error}</p>
            )}
          </div>
          
          <div className="mb-4">
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Получите API ключ на{' '}
              <a
                href="https://nousresearch.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600"
              >
                сайте Nous Research
              </a>
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowApiKeyModal(false)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-gray-200' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Проверка...' : 'Подключить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApiKeyModal;