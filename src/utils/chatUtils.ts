import type { Chat, Message } from '../types';

export const chatUtils = {
  createNewChat: (name?: string): Chat => ({
    id: Date.now(),
    name: name || `Чат ${new Date().toLocaleString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }),
  
  searchInChats: (chats: Chat[], query: string): Chat[] => {
    if (!query.trim()) return chats;
    
    const lowerQuery = query.toLowerCase();
    return chats.filter(chat => {
      // Search in chat name
      if (chat.name.toLowerCase().includes(lowerQuery)) return true;
      
      // Search in messages
      return chat.messages.some(msg => 
        msg.content.toLowerCase().includes(lowerQuery)
      );
    });
  },
  
  exportChatToText: (chat: Chat): string => {
    let content = `# ${chat.name}\n`;
    content += `Создан: ${new Date(chat.createdAt || Date.now()).toLocaleString('ru-RU')}\n`;
    content += `Сообщений: ${chat.messages.length}\n\n`;
    
    chat.messages.forEach((msg, _index) => {
      const role = msg.role === 'user' ? 'Вы' : 'Ассистент';
      const timestamp = msg.timestamp 
        ? new Date(msg.timestamp).toLocaleString('ru-RU')
        : '';
      
      content += `--- ${role} ${timestamp ? `(${timestamp})` : ''} ---\n`;
      content += `${msg.content}\n\n`;
    });
    
    return content;
  },
  
  calculateTokens: (text: string): number => {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  },
  
  calculateChatTokens: (chat: Chat): number => {
    return chat.messages.reduce((total, msg) => {
      return total + chatUtils.calculateTokens(msg.content);
    }, 0);
  },
  
  truncateMessages: (messages: Message[], maxTokens: number): Message[] => {
    const truncated: Message[] = [];
    let totalTokens = 0;
    
    // Start from the most recent messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = chatUtils.calculateTokens(messages[i].content);
      if (totalTokens + msgTokens <= maxTokens) {
        truncated.unshift(messages[i]);
        totalTokens += msgTokens;
      } else {
        break;
      }
    }
    
    return truncated;
  },
  
  generateChatSummary: (chat: Chat): string => {
    if (chat.messages.length === 0) return 'Пустой чат';
    
    const firstUserMessage = chat.messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'Чат без сообщений пользователя';
    
    const summary = firstUserMessage.content.slice(0, 100);
    return summary + (firstUserMessage.content.length > 100 ? '...' : '');
  },
  
  mergeChats: (chat1: Chat, chat2: Chat): Chat => {
    return {
      id: Date.now(),
      name: `${chat1.name} + ${chat2.name}`,
      messages: [...chat1.messages, ...chat2.messages],
      createdAt: Math.min(chat1.createdAt || Date.now(), chat2.createdAt || Date.now()),
      updatedAt: Date.now(),
      metadata: {
        mergedFrom: [chat1.id, chat2.id]
      }
    };
  }
};