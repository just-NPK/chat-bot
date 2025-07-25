// Debounce функция
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  let result: any;

  const debounced = function (this: any, ...args: Parameters<T>) {
    const context = this;

    const later = () => {
      timeout = null;
      if (!immediate) {
        result = func.apply(context, args);
      }
    };

    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);

    if (callNow) {
      result = func.apply(context, args);
    }

    return result;
  };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced as T & { cancel: () => void };
}

// Throttle функция
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;
  let lastResult: any;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      lastResult = func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
    return lastResult;
  } as T;
}

// Мемоизация функций
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return function (this: any, ...args: Parameters<T>) {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn.apply(this, args);
    cache.set(key, result);
    
    // Ограничиваем размер кэша
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    return result;
  } as T;
}

// Web Worker для тяжелых вычислений
export class WorkerPool {
  private workers: Worker[] = [];
  private queue: Array<{
    data: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private busyWorkers = new Set<Worker>();

  constructor(workerScript: string, poolSize = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript);
      this.workers.push(worker);
    }
  }

  async execute(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const availableWorker = this.workers.find(w => !this.busyWorkers.has(w));

      if (availableWorker) {
        this.runWorker(availableWorker, data, resolve, reject);
      } else {
        this.queue.push({ data, resolve, reject });
      }
    });
  }

  private runWorker(
    worker: Worker,
    data: any,
    resolve: (value: any) => void,
    reject: (error: any) => void
  ) {
    this.busyWorkers.add(worker);

    const handleMessage = (e: MessageEvent) => {
      resolve(e.data);
      cleanup();
    };

    const handleError = (e: ErrorEvent) => {
      reject(e);
      cleanup();
    };

    const cleanup = () => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      this.busyWorkers.delete(worker);

      // Обработка очереди
      if (this.queue.length > 0) {
        const next = this.queue.shift()!;
        this.runWorker(worker, next.data, next.resolve, next.reject);
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage(data);
  }

  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.queue = [];
    this.busyWorkers.clear();
  }
}

// Батчинг обновлений
export class UpdateBatcher<T> {
  private updates: T[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  
  constructor(
    private callback: (updates: T[]) => void,
    private delay: number = 16 // ~60fps
  ) {}

  add(update: T) {
    this.updates.push(update);
    
    if (!this.timeoutId) {
      this.timeoutId = setTimeout(() => {
        this.flush();
      }, this.delay);
    }
  }

  flush() {
    if (this.updates.length > 0) {
      this.callback([...this.updates]);
      this.updates = [];
    }
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  clear() {
    this.updates = [];
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

// Оптимизация рендеринга больших текстов
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  
  const truncatedLength = maxLength - suffix.length;
  const lastSpaceIndex = text.lastIndexOf(' ', truncatedLength);
  
  if (lastSpaceIndex > 0) {
    return text.slice(0, lastSpaceIndex) + suffix;
  }
  
  return text.slice(0, truncatedLength) + suffix;
}

// Ленивая загрузка модулей
export async function lazyLoad<T>(
  loader: () => Promise<{ default: T }>
): Promise<T> {
  try {
    const module = await loader();
    return module.default;
  } catch (error) {
    console.error('Failed to lazy load module:', error);
    throw error;
  }
}

// Кэширование результатов API
export class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl: number;

  constructor(ttlInSeconds = 300) { // 5 минут по умолчанию
    this.ttl = ttlInSeconds * 1000;
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Ограничение размера кэша
    if (this.cache.size > 50) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
  }

  clear() {
    this.cache.clear();
  }
}