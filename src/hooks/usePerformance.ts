import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { throttle } from '../utils/performance';

// Хук для дебаунса значения
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Хук для троттлинга функции
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttledCallback = useRef<T>();

  useEffect(() => {
    throttledCallback.current = throttle(callback, delay) as T;
  }, [callback, delay]);

  return throttledCallback.current || callback;
}

// Хук для виртуализации больших списков
export function useVirtualization(
  items: any[],
  containerHeight: number,
  itemHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };
}

// Хук для lazy loading изображений
export function useLazyLoading(
  imageRef: React.RefObject<HTMLImageElement>,
  src: string,
  placeholder?: string
) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => {
      if (imageRef.current) {
        observer.unobserve(imageRef.current);
      }
    };
  }, [imageRef, src]);

  useEffect(() => {
    if (imageSrc && imageSrc !== placeholder) {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => setIsLoading(false);
      img.onerror = () => setIsLoading(false);
    }
  }, [imageSrc, placeholder]);

  return { imageSrc, isLoading };
}

// Хук для оптимизации рендеринга
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef<T>(callback);
  const depsRef = useRef<React.DependencyList>(deps);

  if (!shallowEqual(deps, depsRef.current)) {
    callbackRef.current = callback;
    depsRef.current = deps;
  }

  return useCallback((...args: any[]) => {
    return callbackRef.current(...args);
  }, []) as T;
}

// Хук для измерения производительности
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const renderTime = useRef<number[]>([]);

  useEffect(() => {
    const startTime = performance.now();
    renderCount.current++;

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      renderTime.current.push(duration);

      if (renderCount.current % 10 === 0) {
        const avgTime = renderTime.current.reduce((a, b) => a + b, 0) / renderTime.current.length;
        console.log(`[Performance] ${componentName}: ${renderCount.current} renders, avg: ${avgTime.toFixed(2)}ms`);
        renderTime.current = [];
      }
    };
  });
}

// Хук для управления памятью
export function useMemoryCleanup(cleanup: () => void, deps: React.DependencyList) {
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, deps);
}

// Вспомогательная функция для поверхностного сравнения
function shallowEqual(a: React.DependencyList, b: React.DependencyList): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}