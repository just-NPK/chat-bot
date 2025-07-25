import React, { useState, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { PluginManager } from '../plugins/pluginSystem';
import { AnalyticsService } from '../services/analytics';
import type { Plugin, ChatStatistics } from '../types';

interface AdvancedSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  isOpen,
  onClose,
  isDarkMode
}) => {
  const [activeTab, setActiveTab] = useState<'plugins' | 'sync' | 'analytics' | 'ai'>('plugins');
  const [plugins] = useState<Plugin[]>([]);
  const [syncStatus] = useState<any>(null);
  const [statistics, setStatistics] = useState<ChatStatistics | null>(null);
  const [aiSettings, setAiSettings] = useState({
    autoComplete: true,
    smartSuggestions: true,
    emotionalAnalysis: false,
    codeFormatting: true,
    autoTranslate: false,
    targetLanguage: 'en'
  });
  
  const chats = useChatStore(state => state.chats);
  
  // Инициализация сервисов
  const pluginManager = React.useRef<PluginManager>();
  const analytics = React.useRef(AnalyticsService.getInstance());
  
  useEffect(() => {
    // Загрузка статистики
    if (activeTab === 'analytics') {
      const stats = analytics.current.generateStatistics(chats);
      setStatistics(stats);
    }
  }, [activeTab, chats]);
  
  if (!isOpen) return null;
  
  const modalClasses = `fixed inset-0 flex items-center justify-center z-50 ${
    isDarkMode ? 'bg-black bg-opacity-75' : 'bg-black bg-opacity-50'
  }`;
  
  const contentClasses = `w-full max-w-4xl max-h-[80vh] rounded-lg shadow-xl overflow-hidden ${
    isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
  }`;
  
  return (
    <div className={modalClasses} onClick={onClose}>
      <div className={contentClasses} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className="text-2xl font-semibold">Продвинутые настройки</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Tabs */}
        <div className={`flex border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('plugins')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'plugins'
                ? isDarkMode
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : isDarkMode
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Плагины
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'sync'
                ? isDarkMode
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : isDarkMode
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Синхронизация
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'analytics'
                ? isDarkMode
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : isDarkMode
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Аналитика
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'ai'
                ? isDarkMode
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : isDarkMode
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            AI Функции
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
          {activeTab === 'plugins' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Управление плагинами</h3>
              <div className="space-y-4">
                {plugins.length === 0 ? (
                  <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <p>Плагины не установлены</p>
                    <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                      Загрузить плагин
                    </button>
                  </div>
                ) : (
                  plugins.map(plugin => (
                    <div
                      key={plugin.id}
                      className={`p-4 rounded-lg border ${
                        isDarkMode ? 'border-gray-700' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{plugin.name}</h4>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {plugin.description}
                          </p>
                          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            v{plugin.version} by {plugin.author}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={plugin.enabled}
                            onChange={(e) => {
                              // Toggle plugin
                              pluginManager.current?.togglePlugin(plugin.id, e.target.checked);
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'sync' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Облачная синхронизация</h3>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <h4 className="font-medium mb-2">Google Drive</h4>
                  {syncStatus?.isConnected ? (
                    <div>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Подключено • Последняя синхронизация: {syncStatus.lastSync || 'Никогда'}
                      </p>
                      <button className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                        Отключить
                      </button>
                    </div>
                  ) : (
                    <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                      Подключить Google Drive
                    </button>
                  )}
                </div>
                
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
                }`}>
                  <h4 className="font-medium mb-2">Настройки синхронизации</h4>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span>Автоматическая синхронизация</span>
                  </label>
                  <label className="flex items-center space-x-2 mt-2">
                    <input type="checkbox" className="rounded" />
                    <span>Шифровать данные</span>
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'analytics' && statistics && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Статистика использования</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  <h4 className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Всего чатов
                  </h4>
                  <p className="text-2xl font-bold">{statistics.totalChats}</p>
                </div>
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  <h4 className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Всего сообщений
                  </h4>
                  <p className="text-2xl font-bold">{statistics.totalMessages}</p>
                </div>
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  <h4 className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Примерная стоимость
                  </h4>
                  <p className="text-2xl font-bold">${statistics.estimatedCost.toFixed(2)}</p>
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <h4 className="font-medium mb-2">Топ используемых слов</h4>
                <div className="flex flex-wrap gap-2">
                  {statistics.topWords.slice(0, 10).map(({ word, count }) => (
                    <span
                      key={word}
                      className={`px-3 py-1 rounded-full text-sm ${
                        isDarkMode ? 'bg-gray-800' : 'bg-gray-200'
                      }`}
                    >
                      {word} ({count})
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <button
                  onClick={async () => {
                    await analytics.current.exportReport(statistics, 'csv');
                    // TODO: Implement file save
                    alert('CSV экспорт будет реализован');
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Экспорт CSV
                </button>
                <button
                  onClick={async () => {
                    await analytics.current.exportReport(statistics, 'html');
                    // TODO: Implement file save
                    alert('HTML экспорт будет реализован');
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Экспорт HTML
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'ai' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">AI-powered функции</h3>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={aiSettings.autoComplete}
                    onChange={(e) => setAiSettings({...aiSettings, autoComplete: e.target.checked})}
                    className="rounded"
                  />
                  <div>
                    <span className="font-medium">Автодополнение</span>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Предлагать завершение сообщений во время набора
                    </p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={aiSettings.smartSuggestions}
                    onChange={(e) => setAiSettings({...aiSettings, smartSuggestions: e.target.checked})}
                    className="rounded"
                  />
                  <div>
                    <span className="font-medium">Умные предложения</span>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Показывать предложения следующих сообщений
                    </p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={aiSettings.emotionalAnalysis}
                    onChange={(e) => setAiSettings({...aiSettings, emotionalAnalysis: e.target.checked})}
                    className="rounded"
                  />
                  <div>
                    <span className="font-medium">Анализ эмоций</span>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Анализировать эмоциональный тон сообщений
                    </p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={aiSettings.codeFormatting}
                    onChange={(e) => setAiSettings({...aiSettings, codeFormatting: e.target.checked})}
                    className="rounded"
                  />
                  <div>
                    <span className="font-medium">Форматирование кода</span>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Автоматически форматировать код в сообщениях
                    </p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={aiSettings.autoTranslate}
                    onChange={(e) => setAiSettings({...aiSettings, autoTranslate: e.target.checked})}
                    className="rounded"
                  />
                  <div>
                    <span className="font-medium">Автоперевод</span>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Автоматически переводить сообщения на другие языки
                    </p>
                  </div>
                </label>
                
                {aiSettings.autoTranslate && (
                  <div className="ml-8">
                    <label className="block text-sm font-medium mb-2">
                      Целевой язык
                    </label>
                    <select
                      value={aiSettings.targetLanguage}
                      onChange={(e) => setAiSettings({...aiSettings, targetLanguage: e.target.value})}
                      className={`w-full p-2 rounded-lg border ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="en">English</option>
                      <option value="ru">Русский</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="zh">中文</option>
                      <option value="ja">日本語</option>
                    </select>
                  </div>
                )}
              </div>
              
              <div className="mt-6 p-4 rounded-lg bg-blue-500 bg-opacity-10">
                <p className="text-sm">
                  💡 AI функции используют дополнительные токены и могут увеличить стоимость использования
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};