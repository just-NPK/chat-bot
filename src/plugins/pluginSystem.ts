import { EventEmitter } from 'events';
import type { Chat, Message } from '../types';

// Интерфейсы для плагинов
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface PluginManifest extends Plugin {
  main: string;
  permissions: PluginPermission[];
  dependencies?: Record<string, string>;
  hooks?: PluginHooks;
}

export type PluginPermission = 
  | 'messages:read'
  | 'messages:write'
  | 'chats:read'
  | 'chats:write'
  | 'settings:read'
  | 'settings:write'
  | 'network:fetch'
  | 'storage:read'
  | 'storage:write';

export interface PluginHooks {
  beforeSendMessage?: (message: Message) => Message | Promise<Message>;
  afterReceiveMessage?: (message: Message) => Message | Promise<Message>;
  onChatCreated?: (chat: Chat) => void | Promise<void>;
  onChatDeleted?: (chatId: string | number) => void | Promise<void>;
  onCommand?: (command: string, args: string[]) => boolean | Promise<boolean>;
}

export interface PluginAPI {
  // Методы для работы с чатами
  getChats: () => Chat[];
  getCurrentChat: () => Chat | undefined;
  addMessage: (chatId: string | number, message: Message) => void;
  
  // Методы для работы с UI
  showNotification: (title: string, message: string) => void;
  showModal: (content: React.ReactNode) => void;
  registerCommand: (command: string, handler: (args: string[]) => void) => void;
  
  // Методы для работы с настройками
  getSettings: () => Record<string, any>;
  updateSettings: (settings: Record<string, any>) => void;
  
  // Утилиты
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    remove: (key: string) => Promise<void>;
  };
  
  // События
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
}

// Класс для управления плагинами
export class PluginManager extends EventEmitter {
  private plugins: Map<string, PluginInstance> = new Map();
  private commands: Map<string, (args: string[]) => void> = new Map();
  private hooks: Map<keyof PluginHooks, Array<Function>> = new Map();
  
  constructor(private api: PluginAPI) {
    super();
  }
  
  // Загрузка плагина
  async loadPlugin(manifestPath: string): Promise<void> {
    try {
      const manifestContent = await window.electronAPI.loadData(`plugins:${manifestPath}`);
      const manifest: PluginManifest = JSON.parse(manifestContent);
      
      // Проверка разрешений
      if (!this.checkPermissions(manifest.permissions)) {
        throw new Error(`Plugin ${manifest.name} requires permissions: ${manifest.permissions.join(', ')}`);
      }
      
      // Загрузка основного файла плагина
      const pluginCode = await window.electronAPI.loadData(`plugins:${manifest.main}`);
      const pluginModule = await this.evaluatePlugin(pluginCode, manifest);
      
      const instance = new PluginInstance(manifest, pluginModule, this.api);
      this.plugins.set(manifest.id, instance);
      
      // Регистрация хуков
      if (manifest.hooks) {
        for (const [hookName, handler] of Object.entries(manifest.hooks)) {
          this.registerHook(hookName as keyof PluginHooks, handler);
        }
      }
      
      // Инициализация плагина
      if (pluginModule.initialize) {
        await pluginModule.initialize(this.api);
      }
      
      this.emit('plugin:loaded', manifest);
      console.log(`Plugin ${manifest.name} loaded successfully`);
    } catch (error) {
      console.error(`Failed to load plugin from ${manifestPath}:`, error);
      throw error;
    }
  }
  
  // Выгрузка плагина
  async unloadPlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) return;
    
    // Деинициализация
    if (instance.module.cleanup) {
      await instance.module.cleanup();
    }
    
    // Удаление хуков
    for (const hooks of this.hooks.values()) {
      const index = hooks.findIndex(h => h.toString().includes(pluginId));
      if (index !== -1) {
        hooks.splice(index, 1);
      }
    }
    
    // Удаление команд
    for (const [command, handler] of this.commands.entries()) {
      if (handler.toString().includes(pluginId)) {
        this.commands.delete(command);
      }
    }
    
    this.plugins.delete(pluginId);
    this.emit('plugin:unloaded', pluginId);
  }
  
  // Включение/выключение плагина
  async togglePlugin(pluginId: string, enabled: boolean): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) return;
    
    instance.manifest.enabled = enabled;
    
    if (enabled && instance.module.onEnable) {
      await instance.module.onEnable();
    } else if (!enabled && instance.module.onDisable) {
      await instance.module.onDisable();
    }
    
    this.emit('plugin:toggled', pluginId, enabled);
  }
  
  // Выполнение хука
  async executeHook<T extends keyof PluginHooks>(
    hookName: T,
    ...args: Parameters<NonNullable<PluginHooks[T]>>
  ): Promise<any> {
    const hooks = this.hooks.get(hookName) || [];
    let result = args[0];
    
    for (const hook of hooks) {
      const plugin = this.getPluginByHook(hook);
      if (plugin && plugin.manifest.enabled) {
        try {
          result = await hook(...args);
        } catch (error) {
          console.error(`Hook ${hookName} failed in plugin ${plugin.manifest.name}:`, error);
        }
      }
    }
    
    return result;
  }
  
  // Выполнение команды
  executeCommand(input: string): boolean {
    if (!input.startsWith('/')) return false;
    
    const [command, ...args] = input.slice(1).split(' ');
    const handler = this.commands.get(command);
    
    if (handler) {
      handler(args);
      return true;
    }
    
    return false;
  }
  
  // Получение списка плагинов
  getPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).map(p => p.manifest);
  }
  
  // Приватные методы
  private checkPermissions(_permissions: PluginPermission[]): boolean {
    // Здесь можно добавить логику проверки разрешений
    // Например, показать диалог пользователю
    return true;
  }
  
  private async evaluatePlugin(code: string, manifest: PluginManifest): Promise<any> {
    // Создаем изолированный контекст для плагина
    const pluginContext = {
      console: {
        log: (...args: any[]) => console.log(`[${manifest.name}]`, ...args),
        error: (...args: any[]) => console.error(`[${manifest.name}]`, ...args),
        warn: (...args: any[]) => console.warn(`[${manifest.name}]`, ...args),
      },
      fetch: this.createSafeFetch(manifest),
      setTimeout: window.setTimeout.bind(window),
      setInterval: window.setInterval.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
      clearInterval: window.clearInterval.bind(window),
    };
    
    // Выполняем код плагина в изолированном контексте
    const func = new Function('context', 'api', `
      with (context) {
        ${code}
        return module.exports;
      }
    `);
    
    return func(pluginContext, this.api);
  }
  
  private createSafeFetch(manifest: PluginManifest) {
    return async (url: string, options?: RequestInit) => {
      if (!manifest.permissions.includes('network:fetch')) {
        throw new Error('Plugin does not have network:fetch permission');
      }
      
      // Можно добавить дополнительные проверки URL
      return fetch(url, options);
    };
  }
  
  private registerHook(hookName: keyof PluginHooks, handler: Function): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName)!.push(handler);
  }
  
  private getPluginByHook(hook: Function): PluginInstance | undefined {
    for (const instance of this.plugins.values()) {
      if (Object.values(instance.module).includes(hook)) {
        return instance;
      }
    }
    return undefined;
  }
}

// Класс для экземпляра плагина
class PluginInstance {
  constructor(
    public manifest: PluginManifest,
    public module: any,
    _api: PluginAPI
  ) {}
  
  getConfig(): Record<string, any> {
    return this.manifest.config || {};
  }
  
  updateConfig(config: Record<string, any>): void {
    this.manifest.config = { ...this.manifest.config, ...config };
  }
}