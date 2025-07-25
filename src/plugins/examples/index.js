// Пример 1: Плагин автозамены текста
const autoReplacePlugin = {
  manifest: {
    id: 'auto-replace',
    name: 'Auto Replace',
    version: '1.0.0',
    description: 'Автоматически заменяет сокращения на полный текст',
    author: 'NousChat',
    enabled: true,
    permissions: ['messages:read', 'messages:write'],
    config: {
      replacements: {
        'btw': 'by the way',
        'imo': 'in my opinion',
        'tbh': 'to be honest',
        'brb': 'be right back',
      }
    }
  },
  
  code: `
    const replacements = config.replacements || {};
    
    module.exports = {
      hooks: {
        beforeSendMessage: async (message) => {
          let content = message.content;
          
          for (const [short, full] of Object.entries(replacements)) {
            const regex = new RegExp('\\b' + short + '\\b', 'gi');
            content = content.replace(regex, full);
          }
          
          return { ...message, content };
        }
      },
      
      initialize: async (api) => {
        console.log('Auto Replace plugin initialized');
        
        api.registerCommand('replace', (args) => {
          if (args.length < 2) {
            api.showNotification('Usage', '/replace <short> <full text>');
            return;
          }
          
          const short = args[0];
          const full = args.slice(1).join(' ');
          
          replacements[short] = full;
          api.updateSettings({ replacements });
          api.showNotification('Added', \`"\${short}" will be replaced with "\${full}"\`);
        });
      }
    };
  `
};

// Пример 2: Плагин статистики
const statisticsPlugin = {
  manifest: {
    id: 'chat-statistics',
    name: 'Chat Statistics',
    version: '1.0.0',
    description: 'Показывает статистику использования чата',
    author: 'NousChat',
    enabled: true,
    permissions: ['chats:read', 'messages:read', 'storage:read', 'storage:write']
  },
  
  code: `
    let stats = {
      totalMessages: 0,
      userMessages: 0,
      assistantMessages: 0,
      totalChats: 0,
      totalTokens: 0,
      dailyUsage: {}
    };
    
    module.exports = {
      initialize: async (api) => {
        // Загрузка сохраненной статистики
        const saved = await api.storage.get('statistics');
        if (saved) stats = saved;
        
        // Команда для показа статистики
        api.registerCommand('stats', () => {
          const report = \`
📊 Статистика использования:
• Всего сообщений: \${stats.totalMessages}
• Ваших сообщений: \${stats.userMessages}
• Ответов ассистента: \${stats.assistantMessages}
• Всего чатов: \${stats.totalChats}
• Примерно токенов: \${stats.totalTokens}
          \`;
          
          api.showNotification('Статистика', report);
        });
        
        // Обновление статистики при загрузке
        updateStats(api);
      },
      
      hooks: {
        afterReceiveMessage: async (message) => {
          stats.totalMessages++;
          
          if (message.role === 'user') {
            stats.userMessages++;
          } else if (message.role === 'assistant') {
            stats.assistantMessages++;
          }
          
          // Примерный подсчет токенов (1 токен ≈ 4 символа)
          stats.totalTokens += Math.ceil(message.content.length / 4);
          
          // Сохранение статистики
          await api.storage.set('statistics', stats);
          
          return message;
        },
        
        onChatCreated: async () => {
          stats.totalChats++;
          await api.storage.set('statistics', stats);
        }
      }
    };
    
    function updateStats(api) {
      const chats = api.getChats();
      stats.totalChats = chats.length;
      
      let messages = 0;
      let userMsgs = 0;
      let assistantMsgs = 0;
      let tokens = 0;
      
      chats.forEach(chat => {
        chat.messages.forEach(msg => {
          messages++;
          if (msg.role === 'user') userMsgs++;
          else if (msg.role === 'assistant') assistantMsgs++;
          tokens += Math.ceil(msg.content.length / 4);
        });
      });
      
      stats.totalMessages = messages;
      stats.userMessages = userMsgs;
      stats.assistantMessages = assistantMsgs;
      stats.totalTokens = tokens;
      
      api.storage.set('statistics', stats);
    }
  `
};

// Пример 3: Плагин автосохранения в облако
const cloudBackupPlugin = {
  manifest: {
    id: 'cloud-backup',
    name: 'Cloud Backup',
    version: '1.0.0',
    description: 'Автоматическое резервное копирование в облако',
    author: 'NousChat',
    enabled: false,
    permissions: ['chats:read', 'network:fetch', 'storage:read', 'storage:write'],
    config: {
      endpoint: '',
      apiKey: '',
      interval: 300000, // 5 минут
      encryption: true
    }
  },
  
  code: `
    let backupInterval;
    
    module.exports = {
      initialize: async (api) => {
        const config = api.getSettings();
        
        if (!config.endpoint || !config.apiKey) {
          console.warn('Cloud Backup: Endpoint and API key required');
          return;
        }
        
        // Команда для ручного бэкапа
        api.registerCommand('backup', async () => {
          api.showNotification('Backup', 'Создание резервной копии...');
          const success = await performBackup(api);
          
          if (success) {
            api.showNotification('Backup', 'Резервная копия создана успешно');
          } else {
            api.showNotification('Backup', 'Ошибка создания резервной копии');
          }
        });
        
        // Автоматический бэкап
        startAutoBackup(api);
      },
      
      onEnable: async () => {
        startAutoBackup(api);
      },
      
      onDisable: async () => {
        if (backupInterval) {
          clearInterval(backupInterval);
          backupInterval = null;
        }
      },
      
      cleanup: async () => {
        if (backupInterval) {
          clearInterval(backupInterval);
        }
      }
    };
    
    async function performBackup(api) {
      try {
        const chats = api.getChats();
        const config = api.getSettings();
        
        let data = JSON.stringify({
          chats,
          timestamp: new Date().toISOString(),
          version: '1.0'
        });
        
        // Простое шифрование (в реальности нужно использовать crypto)
        if (config.encryption) {
          data = btoa(data);
        }
        
        const response = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${config.apiKey}\`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data })
        });
        
        return response.ok;
      } catch (error) {
        console.error('Backup failed:', error);
        return false;
      }
    }
    
    function startAutoBackup(api) {
      const config = api.getSettings();
      
      if (backupInterval) {
        clearInterval(backupInterval);
      }
      
      backupInterval = setInterval(() => {
        performBackup(api);
      }, config.interval || 300000);
    }
  `
};

// Экспорт примеров
export const examplePlugins = [
  autoReplacePlugin,
  statisticsPlugin,
  cloudBackupPlugin
];