import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, RefreshCw, AlertTriangle, Check, ShieldCheck, Lock } from 'lucide-react';
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
  speed: number; // bytes/sec (0 if unknown)
  downloaded: number;
  total: number;
  etaSeconds: number; // estimated seconds remaining (0 if unknown)
  verifying: boolean; // post-download integrity steps (SHA256 / signature)
  onUpdate: () => void;
  onDismiss: () => void;
  onOpenSettings: () => void;
  onCancel: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '';
  const mb = bytesPerSec / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB/s`;
  return `${Math.round(bytesPerSec / 1024)} KB/s`;
}

function formatEta(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  if (seconds < 60) return `${Math.ceil(seconds)} ثانية`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `${m} دقيقة${s > 0 ? ` و ${s} ثانية` : ''}`;
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
  speed,
  downloaded,
  total,
  etaSeconds,
  verifying,
  onUpdate,
  onDismiss,
  onOpenSettings,
  onCancel,
}: UpdateModalProps) {
  // A required update is never dismissable (no "لاحقاً" button).
  const dismissable = !required && !downloading && !verifying;

  return (
    <AnimatePresence>
      {open && info && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center font-sans bg-[#0a0e1a]" role="dialog" aria-modal="true" aria-label="تحديث التطبيق">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="relative w-full min-h-dvh max-w-md mx-auto flex flex-col bg-[#0a0e1a] text-right text-slate-200 overflow-y-auto"
            dir="rtl"
            style={{ willChange: 'transform' }}
          >
            {/* Header */}
            <div className="pt-[calc(3rem+env(safe-area-inset-top))] pb-6 px-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-[22px] bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4">
                <Lock size={30} />
              </div>
              <h1 className="text-xl font-bold text-slate-100">يلزم تحديث التطبيق</h1>
              <p className="text-[12px] text-slate-400 mt-2 leading-relaxed max-w-xs">
                يتوفر إصدار جديد يتضمن تحسينات أمنية وإصلاحات مهمة. يجب تثبيت آخر إصدار للاستمرار في استخدام التطبيق.
              </p>
              {info.version && (
                <p className="text-[11px] text-slate-500 mt-2" dir="ltr">
                  v{info.version} متوفر الآن
                </p>
              )}
            </div>

            {/* What's new */}
            {info.notes && info.notes.length > 0 && (
              <div className="px-6 mb-6">
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <p className="text-[11px] text-slate-500 mb-3 font-medium">ما الجديد</p>
                  <ul className="space-y-2">
                    {info.notes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Install permission notice */}
            {needsInstallPermission && !downloading && !verifying && (
              <div className="px-6 mb-4" role="status">
                <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-900/40 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-300 leading-relaxed">
                    يحتاج التطبيق إلى السماح بتثبيت التطبيقات من هذا المصدر مرة واحدة فقط. اضغط «تحديث الآن» لفتح الإعدادات، ثم عُد للتطبيق ليُكمل التثبيت تلقائياً.
                  </p>
                </div>
              </div>
            )}

            {/* Error notice */}
            {error && !downloading && !verifying && (
              <div className="px-6 mb-4" role="alert">
                <div className="p-3 rounded-2xl bg-red-950/30 border border-red-900/40 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-red-300 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Progress / status area */}
            <div className="px-6 mb-6">
              {(downloading || verifying) && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  {/* Percentage + bar */}
                  <div className="flex justify-between items-center mb-2 text-[12px] text-slate-400">
                    <span>{verifying ? 'جارٍ التحقق من التحديث...' : 'جارٍ تنزيل التحديث...'}</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {verifying ? '100%' : `${progress}%`}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={verifying ? 100 : progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={verifying ? 'جارٍ التحقق من التحديث' : 'تقدم تنزيل التحديث'}>
                    <motion.div
                      className="h-full bg-gradient-to-l from-emerald-500 to-emerald-400 rounded-full"
                      animate={{ width: `${verifying ? 100 : progress}%` }}
                      transition={{ ease: 'easeOut', duration: 0.3 }}
                    />
                  </div>

                  {/* Download stats */}
                  {downloading && (
                    <div className="flex justify-between items-center mt-2 text-[10px] text-slate-500">
                      <span>
                        {formatBytes(downloaded)}
                        {total > 0 ? ` / ${formatBytes(total)}` : ''}
                      </span>
                      <span>
                        {formatSpeed(speed)}
                        {etaSeconds > 0 ? ` · المتبقي ${formatEta(etaSeconds)}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Verification stages */}
                  {verifying && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                        <Check size={13} className="shrink-0" />
                        <span>جارٍ التحقق من سلامة الملف (SHA-256)...</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                        <Check size={13} className="shrink-0" />
                        <span>جارٍ التحقق من التوقيع...</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                        <Check size={13} className="shrink-0" />
                        <span>التحديث جاهز للتثبيت</span>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500 mt-3 text-center">
                    {verifying ? 'سيُفتح مثبّت Android تلقائياً' : 'لا تغلق التطبيق حتى اكتمال التنزيل'}
                  </p>
                </div>
              )}
            </div>

            {/* Actions (always at the bottom, full-screen modal) */}
            <div className="mt-auto px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-2 flex flex-col gap-2">
              {needsInstallPermission && !downloading && !verifying && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  <ShieldCheck size={16} />
                  <span>فتح الإعدادات</span>
                </button>
              )}

              {downloading ? (
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-755 text-slate-300 font-medium text-sm rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={15} />
                  <span>إلغاء التنزيل</span>
                </button>
              ) : (
                !verifying &&
                (error && canRetry ? (
                  <button
                    type="button"
                    onClick={onUpdate}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    <RefreshCw size={15} />
                    <span>إعادة المحاولة</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onUpdate}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    <Download size={16} />
                    <span>تحديث الآن</span>
                  </button>
                ))
              )}

              {dismissable && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="w-full py-3.5 text-slate-400 hover:text-slate-200 font-medium text-xs rounded-xl transition-all"
                >
                  لاحقاً
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
