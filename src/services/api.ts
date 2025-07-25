import type { ModelSettings, ApiResponse, Message } from '../types';

export class NousApiService {
  private static instance: NousApiService;
  private apiKey: string | null = null;
  
  private constructor() {}
  
  static getInstance(): NousApiService {
    if (!NousApiService.instance) {
      NousApiService.instance = new NousApiService();
    }
    return NousApiService.instance;
  }
  
  async initialize(): Promise<void> {
    this.apiKey = await window.electronAPI.getApiKey();
    if (!this.apiKey) {
      throw new Error('API key not found');
    }
  }
  
  async sendMessage(
    messages: Message[], 
    settings: ModelSettings
  ): Promise<ApiResponse> {
    if (!this.apiKey) {
      await this.initialize();
    }
    
    const payload = {
      model: settings.model,
      messages: settings.systemPrompt 
        ? [{ role: 'system', content: settings.systemPrompt }, ...messages]
        : messages,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
      top_p: settings.topP,
      stream: settings.stream || false
    };
    
    return window.electronAPI.sendMessage(payload);
  }
  
  async streamMessage(
    messages: Message[],
    settings: ModelSettings,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    // This would be implemented if the API supports streaming
    // For now, we'll use the regular sendMessage
    try {
      const response = await this.sendMessage(messages, { ...settings, stream: false });
      const content = response.choices[0].message.content;
      
      // Simulate streaming by chunking the response
      const words = content.split(' ');
      let currentChunk = '';
      
      for (let i = 0; i < words.length; i++) {
        currentChunk += (i > 0 ? ' ' : '') + words[i];
        
        if (i % 5 === 0 || i === words.length - 1) {
          onChunk(currentChunk);
          currentChunk = '';
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      onComplete();
    } catch (error) {
      onError(error as Error);
    }
  }
  
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Test the API key with a minimal request
      const testPayload = {
        model: 'Hermes-3-Llama-3.1-70B',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
        temperature: 0.1
      };
      
      const response = await fetch('https://inference-api.nousresearch.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(testPayload)
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}