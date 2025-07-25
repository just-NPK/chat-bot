import { app, BrowserWindow, Menu, ipcMain, safeStorage, session, dialog, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import log from 'electron-log';
import fs from 'fs/promises';
import crypto from 'crypto';
import { exportUtils } from './exportUtils.js';
import type { Chat, ExportFormat } from '../types/index.js';

// ES Module совместимость
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Настройка логирования
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB

// Инициализация store с шифрованием
const store = new Store({
  encryptionKey: process.env.STORE_ENCRYPTION_KEY || 'nous-chat-encryption-key',
  watch: true, // Автоматическая синхронизация между окнами
});

// Типизация для electron-store
interface StoreType {
  get(key: string, defaultValue?: any): any;
  set(key: string, value: any): void;
  delete(key: string): void;
  has(key: string): boolean;
}

const typedStore = store as unknown as StoreType;

let mainWindow: BrowserWindow | null = null;
let isDarkMode = false;

// Оптимизация производительности
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

// Функции шифрования
const secureApiKey = {
  encrypt: (text: string): string => {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(text).toString('base64');
    }
    
    // Fallback с улучшенной безопасностью
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(
      process.env.CRYPTO_SECRET || 'nous-chat-secret',
      'salt',
      32
    );
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  },
  
  decrypt: (encryptedData: string): string => {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(encryptedData, 'base64'));
    }
    
    // Fallback
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(
      process.env.CRYPTO_SECRET || 'nous-chat-secret',
      'salt',
      32
    );
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
};

// Создание окна с оптимизациями
async function createWindow() {
  const preloadPath = path.join(__dirname, '..', 'preload.js');
  
  // Проверка файла preload
  try {
    await fs.access(preloadPath);
    log.info('Preload script found at:', preloadPath);
  } catch (error) {
    log.error('Preload script not found:', error);
    throw new Error(`Failed to load preload.js: ${error}`);
  }

  // Загрузка сохраненных настроек
  isDarkMode = typedStore.get('darkMode', false) as boolean;
  const windowState = typedStore.get('windowState', {
    width: 1200,
    height: 800,
    x: undefined,
    y: undefined
  }) as any;

  mainWindow = new BrowserWindow({
    ...windowState,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      webSecurity: true,
      sandbox: true
    },
    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
    show: false, // Показываем после загрузки
    titleBarStyle: 'default',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico')
  });

  // Сохранение состояния окна
  mainWindow.on('resize', debounce(() => saveWindowState(), 1000));
  mainWindow.on('move', debounce(() => saveWindowState(), 1000));

  // Оптимизация загрузки
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    if (process.env.NODE_ENV === 'development') {
      mainWindow?.webContents.openDevTools();
    }
  });

  // Настройка CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self';",
          "script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com;",
          "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com;",
          "font-src 'self' data: https://fonts.gstatic.com;",
          "img-src 'self' data: https:;",
          "connect-src 'self' https://inference-api.nousresearch.com;",
          "worker-src 'self' blob:;"
        ].join(' ')
      }
    });
  });

  // Загрузка приложения
  await mainWindow.loadFile(path.join(__dirname, '..', '..', 'index.html'));
  
  // Отправка начальной темы
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('theme-changed', isDarkMode);
  });

  // Настройка меню
  setupApplicationMenu();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Сохранение состояния окна
function saveWindowState() {
  if (!mainWindow) return;
  
  const bounds = mainWindow.getBounds();
  typedStore.set('windowState', bounds);
}

// Debounce helper
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

// Настройка меню приложения
function setupApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Файл',
      submenu: [
        {
          label: 'Новый чат',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('new-chat')
        },
        {
          label: 'Экспорт чата',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('export-chat')
        },
        { type: 'separator' },
        {
          label: 'Настройки',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('open-settings')
        },
        { type: 'separator' },
        {
          label: 'Выход',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Правка',
      submenu: [
        { label: 'Отменить', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Повторить', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Вырезать', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Копировать', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Вставить', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Выделить все', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: 'Вид',
      submenu: [
        { label: 'Перезагрузить', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Принудительно перезагрузить', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Инструменты разработчика', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Темная тема',
          type: 'checkbox',
          checked: isDarkMode,
          click: () => {
            isDarkMode = !isDarkMode;
            typedStore.set('darkMode', isDarkMode);
            mainWindow?.webContents.send('theme-changed', isDarkMode);
          }
        },
        { type: 'separator' },
        { label: 'Увеличить', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Уменьшить', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'Сбросить масштаб', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Полноэкранный режим', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Помощь',
      submenu: [
        {
          label: 'О программе',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'О программе',
              message: 'Nous Chat',
              detail: 'Версия 1.0.0\nЛокальный клиент для Nous Research API\n\n© 2024',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Открыть DevTools',
          accelerator: 'Ctrl+Shift+I',
          click: () => mainWindow?.webContents.openDevTools()
        },
        { type: 'separator' },
        {
          label: 'Сайт Nous Research',
          click: () => shell.openExternal('https://nousresearch.com')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Инициализация приложения
app.whenReady().then(async () => {
  try {
    await createWindow();
    
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    log.error('Failed to create window:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers с типизацией
ipcMain.handle('save-data', async (_event, key: string, data: any): Promise<boolean> => {
  try {
    typedStore.set(key, data);
    return true;
  } catch (error) {
    log.error(`Failed to save data for key ${key}:`, error);
    throw error;
  }
});

ipcMain.handle('load-data', async (_event, key: string): Promise<any> => {
  try {
    return typedStore.get(key);
  } catch (error) {
    log.error(`Failed to load data for key ${key}:`, error);
    throw error;
  }
});

ipcMain.handle('delete-data', async (_event, key: string): Promise<boolean> => {
  try {
    typedStore.delete(key);
    return true;
  } catch (error) {
    log.error(`Failed to delete data for key ${key}:`, error);
    throw error;
  }
});

ipcMain.handle('save-api-key', async (_event, apiKey: string): Promise<boolean> => {
  try {
    const encrypted = secureApiKey.encrypt(apiKey);
    typedStore.set('encryptedApiKey', encrypted);
    return true;
  } catch (error) {
    log.error('Failed to save API key:', error);
    throw error;
  }
});

ipcMain.handle('get-api-key', async (): Promise<string | null> => {
  try {
    const encrypted = typedStore.get('encryptedApiKey') as string | undefined;
    if (!encrypted) return null;
    
    return secureApiKey.decrypt(encrypted);
  } catch (error) {
    log.error('Failed to get API key:', error);
    return null;
  }
});

ipcMain.handle('save-draft', async (_event, chatId: string | number, draft: string): Promise<boolean> => {
  try {
    const drafts = typedStore.get('drafts', {}) as Record<string, any>;
    drafts[chatId] = {
      content: draft,
      timestamp: Date.now()
    };
    typedStore.set('drafts', drafts);
    return true;
  } catch (error) {
    log.error('Failed to save draft:', error);
    return false;
  }
});

ipcMain.handle('get-draft', async (_event, chatId: string | number): Promise<any> => {
  try {
    const drafts = typedStore.get('drafts', {}) as Record<string, any>;
    return drafts[chatId] || null;
  } catch (error) {
    log.error('Failed to get draft:', error);
    return null;
  }
});

ipcMain.handle('clear-draft', async (_event, chatId: string | number): Promise<boolean> => {
  try {
    const drafts = typedStore.get('drafts', {}) as Record<string, any>;
    delete drafts[chatId];
    typedStore.set('drafts', drafts);
    return true;
  } catch (error) {
    log.error('Failed to clear draft:', error);
    return false;
  }
});

ipcMain.handle('export-chat-advanced', async (_event, chat: Chat, format: ExportFormat) => {
  try {
    let result;
    switch (format) {
      case 'pdf':
        result = await exportUtils.exportToPDF(chat, mainWindow!);
        break;
      case 'docx':
        result = await exportUtils.exportToDOCX(chat, mainWindow!);
        break;
      case 'html':
        result = await exportUtils.exportToHTML(chat, mainWindow!);
        break;
      default:
        throw new Error('Unsupported format: ' + format);
    }
    return { success: true, path: result };
  } catch (error: any) {
    log.error('Export failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-message', async (_event, payload: any) => {
  log.info('Sending message to Nous Research API');
  
  try {
    const apiKey = await secureApiKey.decrypt(typedStore.get('encryptedApiKey') as string);
    if (!apiKey) {
      log.error('API key not found');
      throw new Error('API key not found');
    }

    const response = await fetch('https://inference-api.nousresearch.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000) // 30 секунд таймаут
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    log.info('Message sent successfully');
    return data;
  } catch (error: any) {
    log.error(`Failed to send message: ${error.message}`);
    throw new Error(`Failed to send message: ${error.message}`);
  }
});

// Оптимизация для Windows
if (process.platform === 'win32') {
  app.setAppUserModelId('com.yourcompany.nouschat');
}

// Обработка ошибок
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  dialog.showErrorBox('Непредвиденная ошибка', error.message);
});

process.on('unhandledRejection', (error) => {
  log.error('Unhandled Rejection:', error);
});