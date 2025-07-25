import React, { useState } from 'react';
import { useChatStore } from '../store/chatStore';

const SettingsModal: React.FC = () => {
  const { 
    showSettingsModal, 
    setShowSettingsModal, 
    settings, 
    updateSettings, 
    isDarkMode 
  } = useChatStore();
  
  const [tempSettings, setTempSettings] = useState(settings);
  
  if (!showSettingsModal) return null;
  
  const handleSave = () => {
    updateSettings(tempSettings);
    window.electronAPI.saveData('modelSettings', tempSettings);
    setShowSettingsModal(false);
  };
  
  const handleCancel = () => {
    setTempSettings(settings);
    setShowSettingsModal(false);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className={`p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-slide-in ${
        isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
      }`}>
        <h2 className="text-xl font-semibold mb-6">Настройки модели</h2>
        
        {/* Model Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Модель
          </label>
          <select
            className={`w-full p-3 rounded-lg transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            } border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
            value={tempSettings.model}
            onChange={(e) => setTempSettings({...tempSettings, model: e.target.value as any})}
          >
            <option value="Hermes-3-Llama-3.1-70B">Hermes-3 Llama 70B</option>
            <option value="Hermes-3-Llama-3.1-405B">Hermes-3 Llama 405B</option>
            <option value="DeepHermes-3-Llama-3-8B-Preview">DeepHermes-3 8B</option>
            <option value="DeepHermes-3-Mistral-24B-Preview">DeepHermes-3 24B</option>
          </select>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Выберите модель для генерации ответов
          </p>
        </div>
        
        {/* Temperature */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Температура: {tempSettings.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={tempSettings.temperature}
            onChange={(e) => setTempSettings({...tempSettings, temperature: parseFloat(e.target.value)})}
            className="w-full"
          />
          <div className="flex justify-between text-xs mt-1">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Точные</span>
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Креативные</span>
          </div>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Контролирует случайность ответов. Меньше = более предсказуемые, больше = более разнообразные
          </p>
        </div>
        
        {/* Max Tokens */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Максимум токенов
          </label>
          <input
            type="number"
            min="100"
            max="8000"
            step="100"
            value={tempSettings.maxTokens}
            onChange={(e) => setTempSettings({...tempSettings, maxTokens: parseInt(e.target.value)})}
            className={`w-full p-3 rounded-lg transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            } border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
          />
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Максимальная длина ответа (1 токен ≈ 0.75 слова)
          </p>
        </div>
        
        {/* Top P */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Top P: {tempSettings.topP}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={tempSettings.topP}
            onChange={(e) => setTempSettings({...tempSettings, topP: parseFloat(e.target.value)})}
            className="w-full"
          />
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Альтернативный способ контроля разнообразия. Обычно не нужно менять
          </p>
        </div>
        
        {/* System Prompt */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Системный промпт
          </label>
          <textarea
            value={tempSettings.systemPrompt}
            onChange={(e) => setTempSettings({...tempSettings, systemPrompt: e.target.value})}
            placeholder="Например: Ты полезный ассистент, который отвечает на русском языке..."
            className={`w-full p-3 rounded-lg transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
            } border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
            rows={4}
          />
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Задает контекст и поведение модели для всех сообщений
          </p>
        </div>
        
        {/* Streaming */}
        <div className="mb-6">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={tempSettings.stream || false}
              onChange={(e) => setTempSettings({...tempSettings, stream: e.target.checked})}
              className="rounded"
            />
            <div>
              <span className="font-medium">Потоковая передача</span>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Показывать ответ по мере генерации (экспериментально)
              </p>
            </div>
          </label>
        </div>
        
        {/* Presets */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Быстрые настройки
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setTempSettings({
                ...tempSettings,
                temperature: 0.3,
                topP: 0.9,
                systemPrompt: 'Ты точный и лаконичный ассистент. Отвечай кратко и по существу.'
              })}
              className={`p-2 rounded-lg text-sm transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              📊 Точный
            </button>
            <button
              onClick={() => setTempSettings({
                ...tempSettings,
                temperature: 0.7,
                topP: 0.9,
                systemPrompt: ''
              })}
              className={`p-2 rounded-lg text-sm transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              ⚖️ Сбалансированный
            </button>
            <button
              onClick={() => setTempSettings({
                ...tempSettings,
                temperature: 1.2,
                topP: 0.95,
                systemPrompt: 'Ты креативный и изобретательный ассистент. Предлагай необычные идеи и решения.'
              })}
              className={`p-2 rounded-lg text-sm transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              🎨 Креативный
            </button>
          </div>
        </div>
        
        {/* Info Box */}
        <div className={`p-4 rounded-lg mb-6 ${
          isDarkMode ? 'bg-gray-700' : 'bg-blue-50'
        }`}>
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-blue-800'}`}>
            💡 <strong>Совет:</strong> Для программирования используйте низкую температуру (0.2-0.5), 
            для творческих задач — высокую (0.8-1.5)
          </p>
        </div>
        
        {/* Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'text-gray-400 hover:text-gray-200' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Отмена
          </button>
          <button
            onClick={() => {
              setTempSettings({
                model: 'Hermes-3-Llama-3.1-70B',
                temperature: 0.7,
                maxTokens: 2000,
                topP: 0.9,
                systemPrompt: ''
              });
            }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Сбросить
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;