import type { Message, Chat } from '../types';
import { NousApiService } from './api';

export interface SuggestionResult {
  suggestions: string[];
  confidence: number;
}

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  topics: string[];
}

export interface AutoCompleteResult {
  completions: string[];
  bestMatch: string;
}

export class AIFeaturesService {
  private static instance: AIFeaturesService;
  private apiService: NousApiService;
  private suggestionCache = new Map<string, SuggestionResult>();
  
  private constructor() {
    this.apiService = NousApiService.getInstance();
  }
  
  static getInstance(): AIFeaturesService {
    if (!AIFeaturesService.instance) {
      AIFeaturesService.instance = new AIFeaturesService();
    }
    return AIFeaturesService.instance;
  }
  
  // Умные предложения следующего сообщения
  async generateSmartSuggestions(
    messages: Message[],
    context?: string
  ): Promise<SuggestionResult> {
    const cacheKey = `suggestions:${messages.length}:${context || ''}`;
    const cached = this.suggestionCache.get(cacheKey);
    if (cached) return cached;
    
    try {
      // Подготавливаем контекст для модели
      const recentMessages = messages.slice(-10); // Последние 10 сообщений
      
      const prompt = `Based on the conversation history, suggest 3 possible next messages the user might want to send. 
Context: ${context || 'General conversation'}

Conversation:
${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

Provide suggestions in JSON format:
{
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "confidence": 0.0-1.0
}`;
      
      const response = await this.apiService.sendMessage(
        [{ role: 'user', content: prompt }],
        {
          model: 'Hermes-3-Llama-3.1-70B',
          temperature: 0.7,
          maxTokens: 200,
          topP: 0.9,
          systemPrompt: 'You are a helpful assistant that generates contextual message suggestions. Always respond with valid JSON.'
        }
      );
      
      const content = response.choices[0].message.content;
      const result: SuggestionResult = JSON.parse(content);
      
      // Кэшируем на 1 минуту
      this.suggestionCache.set(cacheKey, result);
      setTimeout(() => this.suggestionCache.delete(cacheKey), 60000);
      
      return result;
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      return {
        suggestions: [],
        confidence: 0
      };
    }
  }
  
  // Автодополнение сообщений
  async generateAutoComplete(
    partial: string,
    messages: Message[]
  ): Promise<AutoCompleteResult> {
    if (partial.length < 3) {
      return { completions: [], bestMatch: '' };
    }
    
    try {
      const context = messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n');
      
      const prompt = `Complete the user's message based on the context.
Context:
${context}

Partial message: "${partial}"

Provide 3 possible completions in JSON format:
{
  "completions": ["full message 1", "full message 2", "full message 3"],
  "bestMatch": "the most likely completion"
}`;
      
      const response = await this.apiService.sendMessage(
        [{ role: 'user', content: prompt }],
        {
          model: 'Hermes-3-Llama-3.1-70B',
          temperature: 0.5,
          maxTokens: 150,
          topP: 0.9,
          systemPrompt: 'You are an autocomplete assistant. Complete messages naturally based on context.'
        }
      );
      
      const content = response.choices[0].message.content;
      const result: AutoCompleteResult = JSON.parse(content);
      
      return result;
    } catch (error) {
      console.error('Failed to generate autocomplete:', error);
      return { completions: [], bestMatch: '' };
    }
  }
  
  // Генерация краткого изложения чата
  async generateChatSummary(chat: Chat): Promise<SummaryResult> {
    if (chat.messages.length < 5) {
      return {
        summary: 'Чат слишком короткий для создания краткого изложения',
        keyPoints: [],
        topics: []
      };
    }
    
    try {
      const messagesText = chat.messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');
      
      const prompt = `Analyze this conversation and provide a summary.

Conversation:
${messagesText}

Provide the analysis in JSON format:
{
  "summary": "2-3 sentence summary of the conversation",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "topics": ["topic 1", "topic 2", "topic 3"]
}`;
      
      const response = await this.apiService.sendMessage(
        [{ role: 'user', content: prompt }],
        {
          model: 'Hermes-3-Llama-3.1-70B',
          temperature: 0.3,
          maxTokens: 300,
          topP: 0.9,
          systemPrompt: 'You are an expert at analyzing conversations and creating concise summaries.'
        }
      );
      
      const content = response.choices[0].message.content;
      const result: SummaryResult = JSON.parse(content);
      
      return result;
    } catch (error) {
      console.error('Failed to generate summary:', error);
      return {
        summary: 'Не удалось создать краткое изложение',
        keyPoints: [],
        topics: []
      };
    }
  }
  
  // Умная категоризация чатов
  async categorizeChat(chat: Chat): Promise<string[]> {
    try {
      const messagesPreview = chat.messages
        .slice(0, 10)
        .map(m => m.content.substring(0, 100))
        .join(' ');
      
      const prompt = `Categorize this conversation into 1-3 relevant categories.

Preview: ${messagesPreview}

Common categories: Programming, Education, Creative Writing, Business, Personal, Technical Support, Research, Entertainment

Respond with JSON: {"categories": ["category1", "category2"]}`;
      
      const response = await this.apiService.sendMessage(
        [{ role: 'user', content: prompt }],
        {
          model: 'Hermes-3-Llama-3.1-70B',
          temperature: 0.3,
          maxTokens: 50,
          topP: 0.9,
          systemPrompt: 'Categorize conversations accurately.'
        }
      );
      
      const content = response.choices[0].message.content;
      const result = JSON.parse(content);
      
      return result.categories || [];
    } catch (error) {
      console.error('Failed to categorize chat:', error);
      return [];
    }
  }
  
  // Определение языка и предложение перевода
  async detectLanguageAndTranslate(
    text: string,
    targetLang = 'en'
  ): Promise<{ language: string; translation?: string }> {
    try {
      const prompt = `Detect the language of this text and translate if needed.

Text: "${text}"
Target language: ${targetLang}

Respond with JSON:
{
  "language": "detected language code",
  "needsTranslation": true/false,
  "translation": "translated text if needed"
}`;
      
      const response = await this.apiService.sendMessage(
        [{ role: 'user', content: prompt }],
        {
          model: 'Hermes-3-Llama-3.1-70B',
          temperature: 0.1,
          maxTokens: 200,
          topP: 0.9,
          systemPrompt: 'You are a language detection and translation assistant.'
        }
      );
      
      const content = response.choices[0].message.content;
      const result = JSON.parse(content);
      
      return {
        language: result.language,
        translation: result.needsTranslation ? result.translation : undefined
      };
    } catch (error) {
      console.error('Failed to detect language:', error);
      return { language: 'unknown' };
    }
  }
  
  // Генерация умных ответов на основе контекста
  async generateContextualResponse(
    messages: Message[],
    style?: 'formal' | 'casual' | 'technical' | 'creative'
  ): Promise<string> {
    try {
      const context = messages.slice(-10);
      const stylePrompt = style ? `Response style: ${style}` : '';
      
      const prompt = `Based on the conversation, generate an appropriate response.
${stylePrompt}

Conversation:
${context.map(m => `${m.role}: ${m.content}`).join('\n')}

Generate a natural continuation as the assistant.`;
      
      const response = await this.apiService.sendMessage(
        [...context, { role: 'user', content: prompt }],
        {
          model: 'Hermes-3-Llama-3.1-70B',
          temperature: style === 'creative' ? 0.9 : 0.7,
          maxTokens: 500,
          topP: 0.9,
          systemPrompt: 'You are a helpful assistant. Match the conversation style and tone.'
        }
      );
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Failed to generate contextual response:', error);
      return '';
    }
  }
  
  // Анализ эмоционального тона
  async analyzeEmotionalTone(message: string): Promise<{
    tone: string;
    emotions: Record<string, number>;
    suggestion?: string;
  }> {
    try {
      const prompt = `Analyze the emotional tone of this message.

Message: "${message}"

Respond with JSON:
{
  "tone": "overall tone (positive/negative/neutral/mixed)",
  "emotions": {
    "joy": 0.0-1.0,
    "anger": 0.0-1.0,
    "sadness": 0.0-1.0,
    "fear": 0.0-1.0,
    "surprise": 0.0-1.0,
    "disgust": 0.0-1.0
  },
  "suggestion": "optional suggestion for response tone"
}`;
      
      const response = await this.apiService.sendMessage(
        [{ role: 'user', content: prompt }],
        {
          model: 'Hermes-3-Llama-3.1-70B',
          temperature: 0.3,
          maxTokens: 200,
          topP: 0.9,
          systemPrompt: 'You are an emotional intelligence assistant.'
        }
      );
      
      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to analyze emotional tone:', error);
      return {
        tone: 'unknown',
        emotions: {}
      };
    }
  }
  
  // Извлечение задач и действий из чата
  async extractActionItems(chat: Chat): Promise<{
    tasks: Array<{ task: string; priority: 'high' | 'medium' | 'low'; deadline?: string }>;
    decisions: string[];
    questions: string[];
  }> {
    try {
      const messagesText = chat.messages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n\n');
      
      const prompt = `Extract action items from this conversation.

Conversation:
${messagesText}

Identify:
1. Tasks that need to be done
2. Decisions that were made
3. Unanswered questions

Respond with JSON:
{
  "tasks": [
    {"task": "description", "priority": "high/medium/low", "deadline": "optional date"}
  ],
  "decisions": ["decision 1", "decision 2"],
  "questions": ["question 1", "question 2"]
}`;
      
      const response = await this.apiService.sendMessage(
        [{ role: 'user', content: prompt }],
        {
          model: 'Hermes-3-Llama-3.1-70B',
          temperature: 0.3,
          maxTokens: 400,
          topP: 0.9,
          systemPrompt: 'You are an expert at extracting actionable items from conversations.'
        }
      );
      
      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to extract action items:', error);
      return {
        tasks: [],
        decisions: [],
        questions: []
      };
    }
  }
  
  // Генерация заголовков для разделов чата
  async generateSectionTitles(messages: Message[]): Promise<Array<{
    startIndex: number;
    endIndex: number;
    title: string;
  }>> {
    if (messages.length < 10) return [];
    
    try {
      // Разбиваем на секции по 10-15 сообщений
      const sections = [];
      for (let i = 0; i < messages.length; i += 10) {
        const section = messages.slice(i, Math.min(i + 15, messages.length));
        const preview = section
          .map(m => m.content.substring(0, 50))
          .join(' ');
        
        const prompt = `Generate a short title (3-5 words) for this conversation section: "${preview}"`;
        
        const response = await this.apiService.sendMessage(
          [{ role: 'user', content: prompt }],
          {
            model: 'Hermes-3-Llama-3.1-70B',
            temperature: 0.5,
            maxTokens: 20,
            topP: 0.9,
            systemPrompt: 'Generate concise, descriptive titles.'
          }
        );
        
        sections.push({
          startIndex: i,
          endIndex: Math.min(i + 15, messages.length) - 1,
          title: response.choices[0].message.content.trim()
        });
      }
      
      return sections;
    } catch (error) {
      console.error('Failed to generate section titles:', error);
      return [];
    }
  }
  
  // Умное форматирование кода
  async formatCodeInMessage(message: string): Promise<string> {
    try {
      const prompt = `Format any code in this message with proper markdown syntax and language detection.

Message: "${message}"

Rules:
1. Detect programming language
2. Add language identifier to code blocks
3. Preserve all non-code text
4. Use inline code for short snippets

Return the formatted message.`;
      
      const response = await this.apiService.sendMessage(
        [{ role: 'user', content: prompt }],
        {
          model: 'Hermes-3-Llama-3.1-70B',
          temperature: 0.1,
          maxTokens: 1000,
          topP: 0.9,
          systemPrompt: 'You are a code formatting assistant.'
        }
      );
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Failed to format code:', error);
      return message;
    }
  }
}