import { useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

const icons: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

const colors: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: 'bg-emerald-900/95', border: 'border-emerald-500/30', icon: 'text-emerald-400', text: 'text-emerald-100' },
  error: { bg: 'bg-red-900/95', border: 'border-red-500/30', icon: 'text-red-400', text: 'text-red-100' },
  warning: { bg: 'bg-amber-900/95', border: 'border-amber-500/30', icon: 'text-amber-400', text: 'text-amber-100' },
  info: { bg: 'bg-blue-900/95', border: 'border-blue-500/30', icon: 'text-blue-400', text: 'text-blue-100' },
};

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-20 left-4 z-50 w-full max-w-sm flex flex-col gap-2 pointer-events-none" dir="rtl">
      {toasts.map(toast => {
        const c = colors[toast.type] ?? colors.info;
        return (
          <div
            key={toast.id}
            className={`${c.bg} ${c.border} backdrop-blur border text-slate-100 rounded-xl p-4 shadow-xl pointer-events-auto flex flex-col gap-2 text-right animate-slide-in`}
            style={{ animation: 'slideIn 0.3s ease-out' }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-700/50 pb-1.5">
              <div className={`flex items-center gap-1.5 font-bold text-xs ${c.icon}`}>
                <span className="material-symbols-outlined text-sm">{icons[toast.type]}</span>
                <span>{toast.title}</span>
              </div>
              <button onClick={() => onDismiss(toast.id)} className="text-slate-500 hover:text-slate-100 transition-colors cursor-pointer p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </div>
            {toast.message && (
              <p className={`text-[11px] leading-relaxed ${c.text}`}>{toast.message}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message: string, duration = 4000) => {
    const id = `toast_${++counterRef.current}_${Date.now()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
      return { id, timeoutId };
    }
    return { id };
  }, []);

  const toastSuccess = useCallback((title: string, message?: string) => addToast('success', title, message || ''), [addToast]);
  const toastError = useCallback((title: string, message?: string) => addToast('error', title, message || ''), [addToast]);
  const toastWarning = useCallback((title: string, message?: string) => addToast('warning', title, message || ''), [addToast]);
  const toastInfo = useCallback((title: string, message?: string) => addToast('info', title, message || ''), [addToast]);

  return { toasts, dismissToast, addToast, toastSuccess, toastError, toastWarning, toastInfo };
}
