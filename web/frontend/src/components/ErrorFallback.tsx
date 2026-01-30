import { useCallback } from 'react';

interface ErrorFallbackProps {
  error: Error;
  resetError?: () => void;
  showHomeButton?: boolean;
}

/**
 * 错误展示 UI 组件
 * 显示友好的错误信息，提供重试和返回首页按钮
 */
export function ErrorFallback({ error, resetError, showHomeButton = true }: ErrorFallbackProps) {
  const handleGoHome = useCallback(() => {
    window.location.href = '/';
  }, []);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Error Icon */}
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Title */}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">出错了</h2>

        {/* Error Message */}
        <p className="text-gray-600 mb-4">
          抱歉，页面遇到了一些问题。请稍后重试。
        </p>

        {/* Error Details (collapsible) */}
        <details className="mb-6 text-left">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            查看错误详情
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-red-600 overflow-auto max-h-32">
            {error.message}
            {error.stack && (
              <>
                {'\n\n'}
                {error.stack}
              </>
            )}
          </pre>
        </details>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          {resetError && (
            <button
              onClick={resetError}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              重试
            </button>
          )}
          {!resetError && (
            <button
              onClick={handleReload}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              刷新页面
            </button>
          )}
          {showHomeButton && (
            <button
              onClick={handleGoHome}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              返回首页
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
