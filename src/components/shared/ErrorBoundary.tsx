import React, { ErrorInfo } from 'react';
import { captureError } from '../../lib/monitor.ts';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onRetry?: () => void;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean; error: Error | null }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureError(error, `ErrorBoundary:${errorInfo.componentStack?.slice(0, 120)}`);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center" role="alert">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl text-red-500">error_outline</span>
          </div>
          <h2 className="text-lg font-bold text-slate-100 mb-2">حدث خطأ غير متوقع</h2>
          <p className="text-sm text-slate-400 mb-6 max-w-md">
            {this.state.error?.message || 'تعذر تحميل هذا القسم. يرجى المحاولة مرة أخرى.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all cursor-pointer"
            >
              إعادة المحاولة
            </button>
          </div>
          {this.state.error && (
            <details className="mt-6 max-w-md">
              <summary className="text-[10px] text-slate-600 cursor-pointer hover:text-slate-500">تفاصيل تقنية</summary>
              <pre className="text-[10px] text-slate-600 mt-2 p-3 bg-slate-900 rounded-lg text-left overflow-auto max-h-32 dir-ltr">
                {this.state.error.stack || this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
