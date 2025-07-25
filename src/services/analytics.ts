import type { Chat, Message } from '../types';
import { chatUtils } from '../utils/chatUtils';

export interface ChatStatistics {
  totalChats: number;
  totalMessages: number;
  messagesByRole: Record<string, number>;
  averageMessagesPerChat: number;
  averageMessageLength: number;
  totalTokens: number;
  estimatedCost: number;
  mostActiveHours: Record<number, number>;
  mostActiveWeekdays: Record<string, number>;
  topWords: Array<{ word: string; count: number }>;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  responseTime: {
    average: number;
    min: number;
    max: number;
  };
}

export interface UsageMetrics {
  daily: Record<string, DailyMetrics>;
  weekly: Record<string, WeeklyMetrics>;
  monthly: Record<string, MonthlyMetrics>;
}

interface DailyMetrics {
  date: string;
  messages: number;
  tokens: number;
  chats: number;
  activeMinutes: number;
}

interface WeeklyMetrics {
  weekStart: string;
  totalMessages: number;
  totalTokens: number;
  uniqueChats: number;
  averageDaily: number;
}

interface MonthlyMetrics {
  month: string;
  totalMessages: number;
  totalTokens: number;
  uniqueChats: number;
  growthRate: number;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private metricsCache: Map<string, any> = new Map();
  
  private constructor() {}
  
  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }
  
  // Генерация общей статистики
  generateStatistics(chats: Chat[]): ChatStatistics {
    const cacheKey = `stats:${chats.length}:${Date.now()}`;
    const cached = this.metricsCache.get(cacheKey);
    if (cached) return cached;
    
    const stats: ChatStatistics = {
      totalChats: chats.length,
      totalMessages: 0,
      messagesByRole: {},
      averageMessagesPerChat: 0,
      averageMessageLength: 0,
      totalTokens: 0,
      estimatedCost: 0,
      mostActiveHours: {},
      mostActiveWeekdays: {},
      topWords: [],
      sentiment: { positive: 0, neutral: 0, negative: 0 },
      responseTime: { average: 0, min: Infinity, max: 0 }
    };
    
    let totalLength = 0;
    const wordFrequency = new Map<string, number>();
    const responseTimes: number[] = [];
    
    // Анализ каждого чата
    chats.forEach(chat => {
      let lastUserMessageTime: number | null = null;
      
      chat.messages.forEach((message, _index) => {
        stats.totalMessages++;
        
        // Подсчет по ролям
        stats.messagesByRole[message.role] = (stats.messagesByRole[message.role] || 0) + 1;
        
        // Длина и токены
        totalLength += message.content.length;
        const tokens = chatUtils.calculateTokens(message.content);
        stats.totalTokens += tokens;
        
        // Время активности
        if (message.timestamp) {
          const date = new Date(message.timestamp);
          const hour = date.getHours();
          const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
          
          stats.mostActiveHours[hour] = (stats.mostActiveHours[hour] || 0) + 1;
          stats.mostActiveWeekdays[weekday] = (stats.mostActiveWeekdays[weekday] || 0) + 1;
        }
        
        // Анализ слов (только для пользовательских сообщений)
        if (message.role === 'user') {
          this.analyzeWords(message.content, wordFrequency);
          lastUserMessageTime = message.timestamp || null;
        }
        
        // Время ответа
        if (message.role === 'assistant' && lastUserMessageTime && message.timestamp) {
          const responseTime = message.timestamp - lastUserMessageTime;
          responseTimes.push(responseTime);
          lastUserMessageTime = null;
        }
        
        // Анализ настроения
        const sentiment = this.analyzeSentiment(message.content);
        stats.sentiment[sentiment]++;
      });
    });
    
    // Вычисление средних значений
    if (stats.totalMessages > 0) {
      stats.averageMessagesPerChat = stats.totalMessages / stats.totalChats;
      stats.averageMessageLength = totalLength / stats.totalMessages;
    }
    
    // Топ слов
    stats.topWords = Array.from(wordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));
    
    // Время ответа
    if (responseTimes.length > 0) {
      stats.responseTime.average = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      stats.responseTime.min = Math.min(...responseTimes);
      stats.responseTime.max = Math.max(...responseTimes);
    }
    
    // Оценка стоимости (примерная)
    // GPT-4: $0.03 per 1K prompt tokens, $0.06 per 1K completion tokens
    const userTokens = stats.totalTokens * 0.4; // Примерно 40% - запросы
    const assistantTokens = stats.totalTokens * 0.6; // 60% - ответы
    stats.estimatedCost = (userTokens * 0.03 + assistantTokens * 0.06) / 1000;
    
    // Кэшируем результат на 5 минут
    this.metricsCache.set(cacheKey, stats);
    setTimeout(() => this.metricsCache.delete(cacheKey), 300000);
    
    return stats;
  }
  
  // Генерация метрик использования
  generateUsageMetrics(chats: Chat[]): UsageMetrics {
    const metrics: UsageMetrics = {
      daily: {},
      weekly: {},
      monthly: {}
    };
    
    // Группировка сообщений по датам
    const messagesByDate = new Map<string, Message[]>();
    
    chats.forEach(chat => {
      chat.messages.forEach(message => {
        if (message.timestamp) {
          const date = new Date(message.timestamp);
          const dateKey = date.toISOString().split('T')[0];
          
          if (!messagesByDate.has(dateKey)) {
            messagesByDate.set(dateKey, []);
          }
          messagesByDate.get(dateKey)!.push(message);
        }
      });
    });
    
    // Генерация дневных метрик
    messagesByDate.forEach((messages, dateKey) => {
      const tokens = messages.reduce((sum, msg) => 
        sum + chatUtils.calculateTokens(msg.content), 0
      );
      
      metrics.daily[dateKey] = {
        date: dateKey,
        messages: messages.length,
        tokens,
        chats: new Set(messages.map(m => m.id)).size,
        activeMinutes: this.calculateActiveMinutes(messages)
      };
    });
    
    // Генерация недельных метрик
    this.aggregateWeeklyMetrics(metrics.daily, metrics.weekly);
    
    // Генерация месячных метрик
    this.aggregateMonthlyMetrics(metrics.daily, metrics.monthly);
    
    return metrics;
  }
  
  // Экспорт отчета
  async exportReport(stats: ChatStatistics, format: 'json' | 'csv' | 'html'): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(stats, null, 2);
        
      case 'csv':
        return this.statsToCSV(stats);
        
      case 'html':
        return this.statsToHTML(stats);
        
      default:
        throw new Error('Unsupported format');
    }
  }
  
  // Приватные методы
  private analyzeWords(text: string, frequency: Map<string, number>): void {
    // Удаляем знаки препинания и приводим к нижнему регистру
    const words = text.toLowerCase()
      .replace(/[^\w\s\u0400-\u04FF]/g, '') // Поддержка кириллицы
      .split(/\s+/)
      .filter(word => word.length > 3); // Только слова длиннее 3 символов
    
    // Список стоп-слов
    const stopWords = new Set([
      'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'been',
      'что', 'как', 'это', 'для', 'при', 'или', 'если', 'быть', 'весь'
    ]);
    
    words.forEach(word => {
      if (!stopWords.has(word)) {
        frequency.set(word, (frequency.get(word) || 0) + 1);
      }
    });
  }
  
  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    // Простой анализ настроения на основе ключевых слов
    const positiveWords = [
      'хорошо', 'отлично', 'спасибо', 'здорово', 'прекрасно', 'замечательно',
      'good', 'great', 'thanks', 'excellent', 'wonderful', 'perfect'
    ];
    
    const negativeWords = [
      'плохо', 'ужасно', 'проблема', 'ошибка', 'неправильно', 'трудно',
      'bad', 'terrible', 'problem', 'error', 'wrong', 'difficult'
    ];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score++;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score--;
    });
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }
  
  private calculateActiveMinutes(messages: Message[]): number {
    if (messages.length === 0) return 0;
    
    const timestamps = messages
      .map(m => m.timestamp)
      .filter(t => t !== undefined) as number[];
    
    if (timestamps.length === 0) return 0;
    
    timestamps.sort((a, b) => a - b);
    
    let activeMinutes = 0;
    let sessionStart = timestamps[0];
    
    for (let i = 1; i < timestamps.length; i++) {
      const gap = timestamps[i] - timestamps[i - 1];
      
      // Если перерыв больше 30 минут, считаем новую сессию
      if (gap > 30 * 60 * 1000) {
        activeMinutes += (timestamps[i - 1] - sessionStart) / 60000;
        sessionStart = timestamps[i];
      }
    }
    
    // Добавляем последнюю сессию
    activeMinutes += (timestamps[timestamps.length - 1] - sessionStart) / 60000;
    
    return Math.round(activeMinutes);
  }
  
  private aggregateWeeklyMetrics(
    daily: Record<string, DailyMetrics>,
    weekly: Record<string, WeeklyMetrics>
  ): void {
    Object.entries(daily).forEach(([dateKey, metrics]) => {
      const date = new Date(dateKey);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekly[weekKey]) {
        weekly[weekKey] = {
          weekStart: weekKey,
          totalMessages: 0,
          totalTokens: 0,
          uniqueChats: 0,
          averageDaily: 0
        };
      }
      
      weekly[weekKey].totalMessages += metrics.messages;
      weekly[weekKey].totalTokens += metrics.tokens;
      weekly[weekKey].uniqueChats = Math.max(weekly[weekKey].uniqueChats, metrics.chats);
    });
    
    // Вычисляем средние значения
    Object.values(weekly).forEach(week => {
      week.averageDaily = week.totalMessages / 7;
    });
  }
  
  private aggregateMonthlyMetrics(
    daily: Record<string, DailyMetrics>,
    monthly: Record<string, MonthlyMetrics>
  ): void {
    Object.entries(daily).forEach(([dateKey, metrics]) => {
      const monthKey = dateKey.substring(0, 7); // YYYY-MM
      
      if (!monthly[monthKey]) {
        monthly[monthKey] = {
          month: monthKey,
          totalMessages: 0,
          totalTokens: 0,
          uniqueChats: 0,
          growthRate: 0
        };
      }
      
      monthly[monthKey].totalMessages += metrics.messages;
      monthly[monthKey].totalTokens += metrics.tokens;
      monthly[monthKey].uniqueChats = Math.max(monthly[monthKey].uniqueChats, metrics.chats);
    });
    
    // Вычисляем рост
    const months = Object.keys(monthly).sort();
    for (let i = 1; i < months.length; i++) {
      const current = monthly[months[i]];
      const previous = monthly[months[i - 1]];
      
      if (previous.totalMessages > 0) {
        current.growthRate = ((current.totalMessages - previous.totalMessages) / previous.totalMessages) * 100;
      }
    }
  }
  
  private statsToCSV(stats: ChatStatistics): string {
    const lines = [
      'Metric,Value',
      `Total Chats,${stats.totalChats}`,
      `Total Messages,${stats.totalMessages}`,
      `Average Messages per Chat,${stats.averageMessagesPerChat.toFixed(2)}`,
      `Average Message Length,${stats.averageMessageLength.toFixed(0)}`,
      `Total Tokens,${stats.totalTokens}`,
      `Estimated Cost,$${stats.estimatedCost.toFixed(2)}`,
      '',
      'Top Words,Count'
    ];
    
    stats.topWords.forEach(({ word, count }) => {
      lines.push(`${word},${count}`);
    });
    
    return lines.join('\n');
  }
  
  private statsToHTML(stats: ChatStatistics): string {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Статистика чатов</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .stat-card { background: #f5f5f5; padding: 15px; border-radius: 8px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
        table { width: 100%; margin-top: 20px; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    </style>
</head>
<body>
    <h1>Статистика использования чатов</h1>
    
    <div class="stat-grid">
        <div class="stat-card">
            <h3>Всего чатов</h3>
            <div class="stat-value">${stats.totalChats}</div>
        </div>
        <div class="stat-card">
            <h3>Всего сообщений</h3>
            <div class="stat-value">${stats.totalMessages}</div>
        </div>
        <div class="stat-card">
            <h3>Примерная стоимость</h3>
            <div class="stat-value">$${stats.estimatedCost.toFixed(2)}</div>
        </div>
    </div>
    
    <h2>Топ слов</h2>
    <table>
        <thead>
            <tr>
                <th>Слово</th>
                <th>Количество</th>
            </tr>
        </thead>
        <tbody>
            ${stats.topWords.map(({ word, count }) => `
                <tr>
                    <td>${word}</td>
                    <td>${count}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>
    `;
  }
}