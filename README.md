# Nous Chat

Продвинутый локальный чат-клиент для работы с Nous Research API с поддержкой плагинов, облачной синхронизации и AI-powered функций.

## 🚀 Возможности

### Основные функции
- 🔐 Безопасное хранение API ключей с шифрованием
- 🌓 Темная/светлая тема с автоматическим сохранением
- 💬 Богатый текстовый редактор с поддержкой Markdown
- 🔍 Поиск по чатам в реальном времени
- 📁 Экспорт в различные форматы (PDF, DOCX, HTML, Markdown, TXT, JSON)
- 💾 Автосохранение черновиков

### Продвинутые функции
- 🔌 Система плагинов с изолированным выполнением
- ☁️ Облачная синхронизация (Google Drive)
- 📊 Детальная статистика и аналитика
- 🤖 AI-powered функции:
  - Умные предложения следующего сообщения
  - Автодополнение на основе контекста
  - Анализ эмоционального тона
  - Извлечение задач из переписки
  - Автоматический перевод

## 📦 Установка

### Требования
- Node.js 18+
- npm или yarn
- Windows 10+, macOS 10.14+, или Linux

### Шаги установки

```bash
# Клонирование репозитория
git clone https://github.com/yourusername/nous-chat.git
cd nous-chat

# Установка зависимостей
npm install

# Сборка проекта
npm run build

# Запуск приложения
npm start
```

## 🛠️ Разработка

### Запуск в режиме разработки

```bash
npm run dev
```

### Структура проекта

```
scripts/            # Скрипты
src/
├── main/           # Основной процесс Electron
├── preload/        # Preload скрипты
├── renderer/       # Renderer процесс (React)
├── components/     # React компоненты
├── services/       # Бизнес-логика
├── store/          # Управление состоянием (Zustand)
├── plugins/        # Система плагинов
├── hooks/          # React хуки
├── utils/          # Утилиты
└── types/          # TypeScript типы
```

## 📱 Создание дистрибутива

### Windows
```bash
npm run package:win
```

### macOS
```bash
npm run package:mac
```

### Linux
```bash
npm run package:linux
```

## 🔌 Создание плагинов

### Пример простого плагина

```javascript
const myPlugin = {
  manifest: {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'Описание плагина',
    author: 'Ваше имя',
    permissions: ['messages:read', 'messages:write']
  },
  code: `
    module.exports = {
      initialize: async (api) => {
        // Регистрация команды
        api.registerCommand('hello', (args) => {
          api.showNotification('Привет', 'Мир!');
        });
        
        // Хук перед отправкой сообщения
        return {
          beforeSendMessage: async (message) => {
            // Модификация сообщения
            return {
              ...message,
              content: message.content + ' (отправлено через плагин)'
            };
          }
        };
      }
    };
  `
};
```

## 🔒 Безопасность

- Все API ключи шифруются с помощью Electron safeStorage
- Строгая Content Security Policy предотвращает XSS атаки
- Плагины выполняются в изолированном контексте
- Все пользовательские данные санитизируются

## 🤝 Вклад в проект

Мы приветствуем вклад в развитие проекта! Пожалуйста:

1. Форкните репозиторий
2. Создайте ветку для вашей функции (`git checkout -b feature/AmazingFeature`)
3. Закоммитьте изменения (`git commit -m 'Add some AmazingFeature'`)
4. Запушьте в ветку (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 🙏 Благодарности

- [Nous Research](https://nousresearch.com) за предоставление API
- [Electron](https://www.electronjs.org/) за фреймворк
- [React](https://reactjs.org/) за UI библиотеку
- Всем контрибьюторам проекта

Сделано с ❤️ для сообщества AI энтузиастов