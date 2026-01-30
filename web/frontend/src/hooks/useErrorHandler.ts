import { useState, useCallback } from 'react';

interface UseErrorHandlerReturn {
  error: Error | null;
  isError: boolean;
  handleError: (error: Error) => void;
  clearError: () => void;
  throwError: () => never | void;
}

/**
 * 自定义 hook 处理异步错误
 * 与 ErrorBoundary 配合使用，可以将异步错误转换为 ErrorBoundary 可捕获的错误
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((err: Error) => {
    console.error('[useErrorHandler] Error captured:', err);
    setError(err);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 抛出错误以便 ErrorBoundary 捕获
  const throwError = useCallback(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    error,
    isError: error !== null,
    handleError,
    clearError,
    throwError,
  };
}

/**
 * 包装异步函数，自动捕获错误
 */
export function useAsyncErrorHandler() {
  const { handleError, clearError, error, isError } = useErrorHandler();

  const wrapAsync = useCallback(
    <T,>(asyncFn: () => Promise<T>): (() => Promise<T | undefined>) => {
      return async () => {
        try {
          clearError();
          return await asyncFn();
        } catch (err) {
          handleError(err instanceof Error ? err : new Error(String(err)));
          return undefined;
        }
      };
    },
    [handleError, clearError]
  );

  return {
    error,
    isError,
    clearError,
    wrapAsync,
  };
}
