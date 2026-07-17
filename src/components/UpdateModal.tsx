import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, RefreshCw, AlertTriangle, Check, ShieldCheck } from 'lucide-react';
import type { AppVersionInfo } from '../lib/appUpdater';

interface UpdateModalProps {
  open: boolean;
  info: AppVersionInfo | null;
  downloading: boolean;
  progress: number;
  error: string | null;
  canRetry: boolean;
  needsInstallPermission: boolean;
  required: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
  onOpenSettings: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export default function UpdateModal({
  open,
  info,
  downloading,
  progress,
  error,
  canRetry,
  needsInstallPermission,
  required,
  onUpdate,
  onDismiss,
  onOpenSettings,
}: UpdateModalProps) {
  return (
    <AnimatePresence>
      {open && info && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 font-sans">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !downloading && !required && onDismiss()}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-right text-slate-200 max-h-[90vh] overflow-y-auto"
            dir="rtl"
          >
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">يوجد إصدار جديد للتطبيق</h3>
                <p className="text-[11px] text-slate-400 mt-0.5" dir="ltr">
                  v{info.version}
                </p>
              </div>
            </div>

            {info.notes && info.notes.length > 0 && (
              <ul className="space-y-2 mb-5">
                {info.notes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            )}

            {needsInstallPermission && !downloading && (
              <div className="mb-4 p-3 rounded-2xl bg-amber-950/30 border border-amber-900/40 flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-300 leading-relaxed">
                  يجب السماح بتثبيت التطبيقات من مصادر غير معروفة أولاً. اضغط «تحديث الآن» لفتح الإعدادات.
                </p>
              </div>
            )}

            {error && !downloading && (
              <div className="mb-4 p-3 rounded-2xl bg-red-950/30 border border-red-900/40 flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-red-300 leading-relaxed">{error}</p>
              </div>
            )}

            {downloading && (
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2 text-[11px] text-slate-400">
                  <span>جاري تنزيل التحديث...</span>
                  <span className="font-mono font-bold text-emerald-400">{progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-l from-emerald-500 to-emerald-400 rounded-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.3 }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 text-center">
                  لا تغلق التطبيق حتى اكتمال التنزيل
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {error && canRetry && !downloading && (
                <button
                  type="button"
                  onClick={onUpdate}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-755 text-slate-300 font-medium text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} />
                  <span>إعادة المحاولة</span>
                </button>
              )}
              {!required && !downloading && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-755 text-slate-300 font-medium text-xs rounded-xl border border-slate-700 transition-all"
                >
                  لاحقاً
                </button>
              )}
              <button
                type="button"
                onClick={needsInstallPermission && !downloading ? onOpenSettings : onUpdate}
                disabled={downloading}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              >
                {downloading ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} />
                    <span>جاري التنزيل...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>{needsInstallPermission ? 'فتح الإعدادات' : 'تحديث الآن'}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
