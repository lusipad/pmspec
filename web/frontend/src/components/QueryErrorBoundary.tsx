import { useCallback, Component, type ReactNode, type ErrorInfo } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';

interface QueryErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

/**
 * React Query 错误展示组件
 * 显示 API 错误信息，提供重新获取按钮
 */
function QueryErrorFallback({ error, resetError }: QueryErrorFallbackProps) {
  const isNetworkError = error.message.includes('fetch') || 
                         error.message.includes('network') ||
                         error.message.includes('Failed to fetch');
  
  const isServerError = error.message.includes('500') || 
                        error.message.includes('502') ||
                        error.message.includes('503');

  const getErrorTitle = () => {
    if (isNetworkError) return '网络连接失败';
    if (isServerError) return '服务器错误';
    return '数据加载失败';
  };

  const getErrorDescription = () => {
    if (isNetworkError) return '请检查您的网络连接后重试。';
    if (isServerError) return '服务器暂时不可用，请稍后重试。';
    return '获取数据时发生错误，请重试。';
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-start">
        {/* Error Icon */}
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <div className="ml-3 flex-1">
          {/* Error Title */}
          <h3 className="text-sm font-medium text-red-800">
            {getErrorTitle()}
          </h3>

          {/* Error Description */}
          <p className="mt-1 text-sm text-red-700">
            {getErrorDescription()}
          </p>

          {/* Error Details */}
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
              查看详情
            </summary>
            <pre className="mt-1 text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto max-h-24">
              {error.message}
            </pre>
          </details>

          {/* Retry Button */}
          <div className="mt-4">
            <button
              onClick={resetError}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              重新获取
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface QueryErrorBoundaryProps {
  children: ReactNode;
}

/**
 * 专门处理 React Query 错误的错误边界
 * 与 React Query 的 useQueryErrorResetBoundary 配合使用
 */
export function QueryErrorBoundary({ children }: QueryErrorBoundaryProps) {
  const { reset } = useQueryErrorResetBoundary();

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <QueryErrorBoundaryInner onReset={handleReset}>
      {children}
    </QueryErrorBoundaryInner>
  );
}

interface QueryErrorBoundaryInnerProps {
  children: ReactNode;
  onReset: () => void;
}

/**
 * 内部组件，处理 React Query 特定的错误显示
 */
class QueryErrorBoundaryInner extends Component<
  QueryErrorBoundaryInnerProps,
  { hasError: boolean; error: Error | null }
> {
  constructor(props: QueryErrorBoundaryInnerProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[QueryErrorBoundaryInner] Caught error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <QueryErrorFallback
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}
