import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ViewType } from '../types';
import { useToast, ToastContainer } from '../hooks/useToast';
import { api } from '../api/client';

interface AdminMoreDrawerProps {
  isMoreOpen: boolean;
  setIsMoreOpen: (open: boolean) => void;
  setView: (view: ViewType) => void;
  onLogout?: () => void;
}

export default function AdminMoreDrawer({ isMoreOpen, setIsMoreOpen, setView, onLogout }: AdminMoreDrawerProps) {
  const [activeSubScreen, setActiveSubScreen] = useState<string | null>(null);
  const [showLogOutDialog, setShowLogOutDialog] = useState(false);

  const { toasts, dismissToast, toastSuccess, toastError, toastWarning, toastInfo } = useToast();

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [backupProgress, setBackupProgress] = useState<number | null>(null);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'running' | 'completed'>('idle');

  useEffect(() => {
    if (activeSubScreen === 'audit-logs' && auditLogs.length === 0 && !auditLogsLoading) {
      setAuditLogsLoading(true);
      api.getAuditLogs()
        .then(data => { setAuditLogs(data || []); })
        .catch(() => { toastError('فشل تحميل سجلات التدقيق'); })
        .finally(() => setAuditLogsLoading(false));
    }
  }, [activeSubScreen, auditLogs.length, auditLogsLoading, toastError]);

  useEffect(() => {
    if (activeSubScreen === 'backup-restore') {
      setBackupProgress(null);
      setBackupStatus('idle');
    }
  }, [activeSubScreen]);

  const createBackup = async () => {
    if (backupStatus === 'running') return;
    setBackupStatus('running');
    setBackupProgress(0);
    try {
      const result = await api.createBackup();
      setBackupProgress(100);
      setBackupStatus('completed');
      setBackupsList(prev => [
        { name: result.filename, size: result.sizeFormatted, date: new Date().toLocaleDateString('ar-YE') },
        ...prev
      ]);
      toastSuccess(`تم إنشاء النسخة الاحتياطية بنجاح (${result.sizeFormatted})`);
    } catch (err: unknown) {
      setBackupStatus('idle');
      setBackupProgress(null);
      toastError(err instanceof Error ? err.message : String(err));
    }
  };

  const downloadBackup = (filename: string) => {
    const url = api.downloadBackup(filename);
    window.open(url, '_blank');
  };

  if (!isMoreOpen) return null;

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        onClick={() => setIsMoreOpen(false)}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="bottom-sheet z-[101] md:!relative md:!rounded-2xl md:max-w-lg lg:max-w-2xl md:mx-auto md:my-auto md:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="الخيارات الإدارية"
      >
        <div className="bottom-sheet-drag md:hidden" />
        <div className="bottom-sheet-header">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-ym text-xl">apps</span>
            <div>
              <h3 className="font-bold text-sm">الخيارات الإدارية</h3>
              <p className="text-[10px] text-slate-500">أدوات ومستلزمات النظام</p>
            </div>
          </div>
          <button onClick={() => setIsMoreOpen(false)}
            className="touch-target flex items-center justify-center p-2 hover:bg-slate-800/50 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="bottom-sheet-body space-y-4">
          <div className="space-y-2">
            <h4 className="text-[10px] text-slate-500 bg-slate-800/50 px-2.5 py-1 rounded-md font-bold inline-block select-none">🛡️ المراقبة والتدقيق الأمني</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button onClick={() => { setView('duplicate-identities'); setIsMoreOpen(false); }}
                className="w-full text-right p-3 card-enhanced hover:border-slate-600 flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-red-500 text-lg">policy</span>
                  <span className="text-xs font-bold text-slate-200">المراقبة ومكافحة التسييل</span>
                </div>
                <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">أمني</span>
              </button>
              <button onClick={() => { setActiveSubScreen('audit-logs'); }}
                className="w-full text-right p-3 card-enhanced hover:border-slate-600 flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-sf text-lg">list_alt</span>
                  <span className="text-xs font-bold text-slate-200">سجلات التدقيق الأمني</span>
                </div>
                <span className="material-symbols-outlined text-slate-600 text-sm group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] text-slate-500 bg-slate-800/50 px-2.5 py-1 rounded-md font-bold inline-block select-none">🌐 البنية التحتية</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button onClick={() => { setActiveSubScreen('backup-restore'); }}
                className="w-full text-right p-3 card-enhanced hover:border-slate-600 flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-2.5"><span className="material-symbols-outlined text-slate-400 group-hover:text-sf text-lg">backup</span><span className="text-xs font-bold text-slate-200">النسخ الاحتياطي</span></div>
                <span className="material-symbols-outlined text-slate-600 text-sm">arrow_back</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] text-slate-500 bg-slate-800/50 px-2.5 py-1 rounded-md font-bold inline-block select-none">ℹ️ المساعدة والدعم</h4>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => { setActiveSubScreen('support-center'); }}
                className="p-3 card-enhanced hover:border-slate-600 flex flex-col items-center text-center gap-1 cursor-pointer">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-ym text-2xl">contact_support</span>
                <span className="text-[10px] font-bold text-slate-300">مركز الدعم</span>
              </button>
              <button onClick={() => { setActiveSubScreen('help-guide'); }}
                className="p-3 card-enhanced hover:border-slate-600 flex flex-col items-center text-center gap-1 cursor-pointer">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-sf text-2xl">help_outline</span>
                <span className="text-[10px] font-bold text-slate-300">دليل الاستخدام</span>
              </button>
              <button onClick={() => { setActiveSubScreen('about-system'); }}
                className="p-3 card-enhanced hover:border-slate-600 flex flex-col items-center text-center gap-1 cursor-pointer">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-you text-2xl">info</span>
                <span className="text-[10px] font-bold text-slate-300">حول النظام</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bottom-sheet-header border-t border-slate-800 mt-auto">
          <button onClick={() => setShowLogOutDialog(true)}
            className="w-full flex items-center justify-center gap-2 bg-ym hover:bg-red-700 active:scale-[0.98] text-white py-3.5 px-5 rounded-xl font-bold text-xs transition-all cursor-pointer min-h-[48px]">
            <span className="material-symbols-outlined text-base">logout</span>
            تسجيل الخروج الآمن من النظام
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {activeSubScreen !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110]"
            onClick={() => setActiveSubScreen(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activeSubScreen !== null && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="bottom-sheet z-[111] md:!relative md:!rounded-2xl md:max-w-2xl md:mx-auto md:my-auto md:max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="الشاشة الفرعية"
          >
            <div className="bottom-sheet-drag md:hidden" />
            <div className="bottom-sheet-header">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-ym text-lg shrink-0">
                  {activeSubScreen === 'audit-logs' && 'policy'}
                  {activeSubScreen === 'backup-restore' && 'backup'}
                  {activeSubScreen === 'support-center' && 'contact_support'}
                  {activeSubScreen === 'help-guide' && 'help_outline'}
                  {activeSubScreen === 'about-system' && 'info'}
                </span>
                <span className="font-bold text-xs truncate">
                  {activeSubScreen === 'audit-logs' && 'سجلات التدقيق الأمني'}
                  {activeSubScreen === 'backup-restore' && 'النسخ الاحتياطي'}
                  {activeSubScreen === 'support-center' && 'مركز الدعم الفني'}
                  {activeSubScreen === 'help-guide' && 'دليل الاستخدام'}
                  {activeSubScreen === 'about-system' && 'حول النظام'}
                </span>
              </div>
              <button onClick={() => setActiveSubScreen(null)}
                className="touch-target flex items-center justify-center p-2 hover:bg-slate-800/50 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="bottom-sheet-body space-y-3 select-text">
              {activeSubScreen === 'audit-logs' && (
                <div className="space-y-3">
                  <p className="text-xs sm:text-[11px] text-slate-500">سجل تعقب الأحداث في الخادم للمسؤولين وحراس الأمان بالموقع.</p>
                  {auditLogsLoading ? (
                    <div className="text-center py-8 text-slate-500 text-xs">جاري التحميل...</div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">لا توجد سجلات تدقيق متاحة</div>
                  ) : (
                    <div className="space-y-2">
                      {auditLogs.map((log: any, i: number) => (
                        <div key={log.id || i} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-200 block">{log.title}</span>
                            <span className="text-[10px] text-slate-500">{log.type} • {log.user}</span>
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] text-slate-500 block">{log.time}</span>
                            <span className={`text-[9px] font-bold ${log.status === 'blocked' ? 'text-red-400' : log.status === 'verified' ? 'text-emerald-400' : log.status === 'analyzing' ? 'text-yellow-400' : 'text-slate-400'}`}>{log.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSubScreen === 'backup-restore' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                    <h4 className="font-bold text-xs text-slate-200">توليد نسخة أمنية مشفرة</h4>
                    <p className="text-[11px] text-slate-500 leading-normal">سيقوم الخادم بحشد قاعدة البيانات بالكامل وضغطها ثم تشفيرها.</p>
                    {backupProgress !== null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-ym font-mono"><span>جاري الأرشفة...</span><span>{backupProgress}%</span></div>
                        <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden"><div className="bg-ym h-full rounded-full transition-all duration-150" style={{ width: `${backupProgress}%` }}></div></div>
                      </div>
                    )}
                    {backupStatus === 'completed' && <div className="p-2 bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 rounded-lg text-[10px] font-semibold">✓ تم حزم النسخة الاحتياطية بنجاح.</div>}
                    <button onClick={createBackup} disabled={backupStatus === 'running'}
                      className="w-full bg-ym hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
                      <span className="material-symbols-outlined text-sm">backup</span>
                      {backupStatus === 'running' ? 'جاري...' : 'إجراء نسخ احتياطي'}
                    </button>
                  </div>
                  {backupsList.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-extrabold text-[11px] text-slate-500">ملفات الأرشيف المتوفرة:</h4>
                      <div className="border border-slate-800 rounded-xl divide-y divide-slate-800 text-[10.5px]">
                        {backupsList.map((bk, i) => (
                          <div key={i} className="p-3 bg-slate-950 flex justify-between items-center font-mono">
                            <div><p className="font-bold text-slate-200 text-xs">{bk.name}</p><p className="text-[10px] text-slate-500 mt-1">{bk.date} • {bk.size}</p></div>
                            <button onClick={() => downloadBackup(bk.name)} className="text-ym hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer">
                              <span className="material-symbols-outlined text-sm">download</span> تنزيل
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSubScreen === 'support-center' && (
                <div className="space-y-3.5">
                  <p className="text-[11px] text-slate-500">مركز المساعدة والاتصال الموثق.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <h4 className="font-extrabold text-slate-200 text-xs">رقم هاتف الدعم</h4>
                      <p className="font-mono font-bold text-slate-400">800-TELESYSTEM</p>
                    </div>
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <h4 className="font-extrabold text-slate-200 text-xs">البريد الأمني</h4>
                      <p className="font-mono font-bold text-slate-400">audit@domain.com</p>
                    </div>
                  </div>
                </div>
              )}

              {activeSubScreen === 'help-guide' && (
                <div className="space-y-4">
                  <div className="space-y-3 text-[11px] leading-relaxed text-slate-400">
                    <h4 className="font-bold text-xs text-slate-200">كتيب الإجراءات الوقائية:</h4>
                    <p>١. <strong>تسييل الهويات:</strong> يجب على المسؤولين الرقابة على البائعين للتحقق من عدم تفعيل عدة شرائح لنفس الهوية.</p>
                    <p>٢. <strong>الجرد والتوزيع:</strong> توزيع كتلة الشرائح بطلب رسمي موثق من المركز المالي.</p>
                    <p>٣. <strong>التنبيهات الأمنية:</strong> عند استلام تنبيه عالي الخطورة، يتم تجميد حساب الوكيل المشتبه به احترازياً.</p>
                  </div>
                </div>
              )}

              {activeSubScreen === 'about-system' && (
                <div className="text-center py-6 space-y-4">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-200 font-sans tracking-wide">نظام إدارة توزيع الشرائح</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">المؤسسة العامة للاتصالات - الجمهورية اليمنية</p>
                    <p className="text-[9px] text-slate-600 font-mono mt-2">v4.2.0 (YEMEN-TELECOM-PROD)</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bottom-sheet-header border-t border-slate-800 mt-auto">
              <button onClick={() => setActiveSubScreen(null)}
                className="w-full py-3.5 bg-ym hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer min-h-[48px]">حسناً، فهمت ذلك</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showLogOutDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="تأكيد تسجيل الخروج">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card-enhanced max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-red-500">
              <span className="material-symbols-outlined text-2xl font-bold">warning</span>
              <h4 className="font-extrabold text-sm">تأكيد تسجيل الخروج</h4>
            </div>
            <p className="text-xs text-slate-400 leading-normal">هل أنت متأكد من رغبتك في تسجيل الخروج من النظام حالياً؟</p>
            <div className="flex gap-2.5 pt-2">
              <button onClick={() => { setShowLogOutDialog(false); setIsMoreOpen(false); if (onLogout) onLogout(); }}
                className="flex-1 bg-ym hover:bg-red-700 active:scale-[0.98] text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer min-h-[48px]">نعم، تسجيل الخروج</button>
              <button onClick={() => setShowLogOutDialog(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer min-h-[48px]">تراجع</button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
