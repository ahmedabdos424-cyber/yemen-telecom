import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
}

export default function ConfirmModal({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'danger',
  icon
}: ConfirmModalProps) {
  const colorMap = {
    danger: { bg: 'bg-red-600/10 border-red-500/20 text-red-500', btn: 'bg-red-600 hover:bg-red-500', iconBg: 'bg-red-600/10 border-red-500/20 text-red-500' },
    warning: { bg: 'bg-amber-600/10 border-amber-500/20 text-amber-500', btn: 'bg-amber-500 hover:bg-amber-400', iconBg: 'bg-amber-600/10 border-amber-500/20 text-amber-500' },
    info: { bg: 'bg-blue-600/10 border-blue-500/20 text-blue-500', btn: 'bg-blue-600 hover:bg-blue-500', iconBg: 'bg-blue-600/10 border-blue-500/20 text-blue-500' },
  };
  const colors = colorMap[variant];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            className="relative w-full max-w-sm md:max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto text-slate-200 z-10 text-right font-sans"
            dir="rtl"
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/60">
              <div className={`flex items-center gap-2`}>
                <div className={`w-8 h-8 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
                  {icon || (
                    variant === 'danger'
                      ? <span className="material-symbols-outlined text-sm">warning</span>
                      : variant === 'warning'
                      ? <span className="material-symbols-outlined text-sm">error</span>
                      : <span className="material-symbols-outlined text-sm">info</span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-100">{title}</h3>
              </div>
              <button
                onClick={onCancel}
                className="btn-icon text-slate-500 hover:text-slate-100"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
            </div>

            <div className="flex gap-3">
              <button
                 onClick={onConfirm}
                 className={`btn flex-1 ${colors.btn} text-white shadow-md text-center`}
              >
                {confirmLabel}
              </button>
              <button
                 onClick={onCancel}
                 className="btn btn-ghost flex-1 text-slate-300 text-center"
              >
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
