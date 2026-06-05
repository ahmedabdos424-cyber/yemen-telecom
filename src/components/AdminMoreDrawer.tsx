import React, { useState, useEffect } from 'react';
import { ViewType } from '../types';

interface AdminMoreDrawerProps {
  isMoreOpen: boolean;
  setIsMoreOpen: (open: boolean) => void;
  setView: (view: ViewType) => void;
  onLogout?: () => void;
}

export default function AdminMoreDrawer({ isMoreOpen, setIsMoreOpen, setView, onLogout }: AdminMoreDrawerProps) {
  const [activeSubScreen, setActiveSubScreen] = useState<string | null>(null);
  const [backupProgress, setBackupProgress] = useState<number | null>(null);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [backupsList, setBackupsList] = useState([
    { name: 'AUTO-BACKUP-20260531-0000.sql.gpg', size: '14.2 MB', date: '31/05/2026' },
    { name: 'MANUAL-BACKUP-20260515-1422.sql.gpg', size: '13.9 MB', date: '15/05/2026' }
  ]);
  const [simulatedUsers, setSimulatedUsers] = useState([
    { id: 'usr-101', name: 'أحمد صالح المهدي', email: 'ahmed.mahdi@telecom.ye', role: 'مدير العمليات', status: 'نشط', lastActive: 'الآن' },
    { id: 'usr-102', name: 'يسرى عبدالله كحيل', email: 'y.kahil@telecom.ye', role: 'مشرف حسابات مالي', status: 'نشط', lastActive: 'منذ ١٢ دقيقة' },
    { id: 'usr-103', name: 'محمد ناصر الحداء', email: 'm.haddah@telecom.ye', role: 'مدير الدعم والتحقق', status: 'توقيف مؤقت', lastActive: 'منذ يومين' },
    { id: 'usr-104', name: 'خالد عبدالله الكبسي', email: 'k.kibsi@telecom.ye', role: 'مسؤول الرقابة المحيطية', status: 'نشط', lastActive: 'منذ ساعة' }
  ]);
  const [activeWebhooks, setActiveWebhooks] = useState([
    { name: 'بوابة Yemen Mobile لتسييل الشرائح', url: 'https://api.yemenmobile.com.ye/v2/webhook', active: true },
    { name: 'بوابة Sabafon للمطابقة الأوتوماتيكية', url: 'https://core.sabafon.com.ye/api/v1/sim-callback', active: false },
    { name: 'نظام إرسال رسائل التحقق المزدوج SMS Gateway', url: 'https://sms-server.yemen.net/send_webhook', active: true }
  ]);
  const [rolePermissions, setRolePermissions] = useState({
    admin: { label: 'مدير عام بالنظام كامل الصلاحيات', read: true, write: true, delete: true, suspend: true },
    supervisor: { label: 'مشرف مبيعات الموزعين بالفرع', read: true, write: true, delete: false, suspend: true },
    auditor: { label: 'مدقق ومفتش مالي للشرائح', read: true, write: false, delete: false, suspend: false }
  });
  const [showLogOutDialog, setShowLogOutDialog] = useState(false);
  const [logoutMessageVisible, setLogoutMessageVisible] = useState(false);

  const runBackupSimulation = () => {
    if (backupStatus === 'running') return;
    setBackupStatus('running');
    setBackupProgress(0);
  };

  useEffect(() => {
    let t: any;
    if (backupStatus === 'running' && backupProgress !== null) {
      if (backupProgress < 100) {
        t = setTimeout(() => {
          setBackupProgress(p => (p !== null ? Math.min(p + 10, 100) : null));
        }, 150);
      } else {
        setBackupStatus('completed');
        const formattedDate = new Date().toLocaleDateString('ar-YE');
        const fileName = `MANUAL-BACKUP-20260601-${Math.floor(1000 + Math.random() * 9000)}.sql.gpg`;
        setBackupsList(prev => [
          { name: fileName, size: '14.5 MB', date: formattedDate },
          ...prev
        ]);
        setBackupProgress(null);
      }
    }
    return () => clearTimeout(t);
  }, [backupProgress, backupStatus]);

  if (!isMoreOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-gray-950/60 backdrop-blur-xs z-[100] flex justify-center items-end md:items-center p-0 md:p-4 animate-in fade-in duration-150"
        onClick={() => setIsMoreOpen(false)}
      >
        <div
          className="bg-white w-full md:max-w-lg lg:max-w-2xl rounded-t-3xl md:rounded-2xl shadow-2xl border md:border-slate-200 max-h-[90vh] md:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-bottom-0 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 md:px-6 py-3 md:py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-2 md:gap-2.5">
              <span className="material-symbols-outlined text-secondary text-xl md:text-2xl">apps</span>
              <div>
                <h3 className="font-bold text-xs md:text-sm font-sans tracking-wide">الخيارات الإدارية لتطبيقات النظام</h3>
                <p className="text-[9px] md:text-[10px] text-slate-400 font-medium">الولوج إلى أدوات ومستلزمات وعافية الاتصالات الفرعية</p>
              </div>
            </div>
            <button onClick={() => setIsMoreOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer touch-target">
              <span className="material-symbols-outlined text-sm font-bold">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-3 md:py-4 space-y-4 md:space-y-5 bg-slate-950/70 text-right dir-rtl">
            <div className="space-y-2">
              <h4 className="text-[10px] text-slate-400 bg-slate-300/50 px-2.5 py-1 rounded-md font-bold inline-block select-none">👥 العمليات والوكلاء ومراقبة البيع</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button onClick={() => { setActiveSubScreen('user-management'); }}
                  className="w-full text-right p-3 bg-white border border-slate-300/50 hover:bg-sky-50 rounded-xl transition-all cursor-pointer flex items-center justify-between group">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-sky-600 text-lg">person_search</span>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">إدارة مستخدمي النظام</span>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 text-sm group-hover:translate-x-[-2px] transition-transform">arrow_back</span>
                </button>
                <button onClick={() => { setView('sellers'); setIsMoreOpen(false); }}
                  className="w-full text-right p-3 bg-white border border-slate-300/50 hover:bg-sky-50 rounded-xl transition-all cursor-pointer flex items-center justify-between group">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-sky-600 text-lg">storefront</span>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">إدارة البائعين ونقاط البيع</span>
                  </div>
                  <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold ml-1">نشط</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] text-slate-400 bg-slate-300/50 px-2.5 py-1 rounded-md font-bold inline-block select-none">🛡️ المراقبة والتدقيق الأمني وتكامل الهويات</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button onClick={() => { setView('duplicate-identities'); setIsMoreOpen(false); }}
                  className="w-full text-right p-3 bg-white border border-slate-300/50 hover:bg-sky-50 rounded-xl transition-all cursor-pointer flex items-center justify-between group">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-red-600 text-lg">policy</span>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">المراقبة ومكافحة التسييل</span>
                  </div>
                  <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold ml-1">أمني</span>
                </button>
                <button onClick={() => { setActiveSubScreen('audit-logs'); }}
                  className="w-full text-right p-3 bg-white border border-slate-300/50 hover:bg-sky-50 rounded-xl transition-all cursor-pointer flex items-center justify-between group">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-sky-600 text-lg">list_alt</span>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">سجلات التدقيق الأمني (Audit)</span>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 text-sm group-hover:translate-x-[-2px] transition-transform">arrow_back</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] text-slate-400 bg-slate-300/50 px-2.5 py-1 rounded-md font-bold inline-block select-none">🌐 الشبكات والبنية التحتية والمخازن</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button onClick={() => { setActiveSubScreen('operator-management'); }}
                  className="w-full text-right p-3 bg-white border border-slate-300/50 hover:bg-sky-50 rounded-xl transition-all cursor-pointer flex items-center justify-between group">
                  <div className="flex items-center gap-2.5"><span className="material-symbols-outlined text-slate-400 group-hover:text-sky-600 text-lg">cell_tower</span><span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">إدارة مشغلي الاتصالات</span></div>
                  <span className="material-symbols-outlined text-gray-300 text-sm">arrow_back</span>
                </button>
                <button onClick={() => { setActiveSubScreen('storage-management'); }}
                  className="w-full text-right p-3 bg-white border border-slate-300/50 hover:bg-sky-50 rounded-xl transition-all cursor-pointer flex items-center justify-between group">
                  <div className="flex items-center gap-2.5"><span className="material-symbols-outlined text-slate-400 group-hover:text-sky-600 text-lg">warehouse</span><span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">إدارة المستودعات والتخزين</span></div>
                  <span className="material-symbols-outlined text-gray-300 text-sm">arrow_back</span>
                </button>
                <button onClick={() => { setActiveSubScreen('system-health'); }}
                  className="w-full text-right p-3 bg-white border border-slate-300/50 hover:bg-sky-50 rounded-xl transition-all cursor-pointer flex items-center justify-between group">
                  <div className="flex items-center gap-2.5"><span className="material-symbols-outlined text-slate-400 group-hover:text-green-500 text-lg">dns</span><span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">صحة وحالة الخوادم</span></div>
                  <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>100%</div>
                </button>
                <button onClick={() => { setActiveSubScreen('backup-restore'); }}
                  className="w-full text-right p-3 bg-white border border-slate-300/50 hover:bg-sky-50 rounded-xl transition-all cursor-pointer flex items-center justify-between group">
                  <div className="flex items-center gap-2.5"><span className="material-symbols-outlined text-slate-400 group-hover:text-sky-600 text-lg">backup</span><span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">النسخ الاحتياطي والاستعادة</span></div>
                  <span className="material-symbols-outlined text-gray-300 text-sm">arrow_back</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] text-slate-400 bg-slate-300/50 px-2.5 py-1 rounded-md font-bold inline-block select-none">🛡️ صلاحيات الموظفين والربط البرمجي</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button onClick={() => { setActiveSubScreen('permissions-roles'); }}
                  className="w-full text-right p-3 bg-white border border-slate-300/50 hover:bg-sky-50 rounded-xl transition-all cursor-pointer flex items-center justify-between group">
                  <div className="flex items-center gap-2.5"><span className="material-symbols-outlined text-slate-400 group-hover:text-sky-600 text-lg">badge</span><span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">الصلاحيات وأدوار الموظفين</span></div>
                  <span className="material-symbols-outlined text-gray-300 text-sm">arrow_back</span>
                </button>
                <button onClick={() => { setActiveSubScreen('integrations'); }}
                  className="w-full text-right p-3 bg-white border border-slate-300/50 hover:bg-sky-50 rounded-xl transition-all cursor-pointer flex items-center justify-between group">
                  <div className="flex items-center gap-2.5"><span className="material-symbols-outlined text-slate-400 group-hover:text-sky-600 text-lg">api</span><span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">التكامل الخارجي ويبهوك (API)</span></div>
                  <span className="material-symbols-outlined text-gray-300 text-sm">arrow_back</span>
                </button>
                <button onClick={() => { setView('reports'); setIsMoreOpen(false); }}
                  className="w-full text-right p-3 bg-white border border-slate-300/50 hover:bg-sky-50 rounded-xl transition-all cursor-pointer flex items-center justify-between group sm:col-span-2">
                  <div className="flex items-center gap-2.5"><span className="material-symbols-outlined text-slate-400 group-hover:text-sky-600 text-lg">query_stats</span><span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">تقارير وتحليلات متقدمة</span></div>
                  <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">تقرير</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] text-slate-400 bg-slate-300/50 px-2.5 py-1 rounded-md font-bold inline-block select-none">ℹ️ المساعدة ومعلومات الخدمة والدعم</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button onClick={() => { setActiveSubScreen('support-center'); }}
                  className="w-full text-right p-3 bg-white border border-slate-300/50 hover:bg-sky-50 rounded-xl transition-all cursor-pointer flex flex-col justify-center items-center text-center gap-1 group">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-sky-600 text-2xl">contact_support</span>
                  <span className="text-[10px] font-extrabold text-slate-700">مركز الدعم</span>
                </button>
                <button onClick={() => { setActiveSubScreen('help-guide'); }}
                  className="w-full text-right p-3 bg-white border border-slate-300/50 hover:bg-sky-50 rounded-xl transition-all cursor-pointer flex flex-col justify-center items-center text-center gap-1 group">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-sky-600 text-2xl">help_outline</span>
                  <span className="text-[10px] font-extrabold text-slate-700">دليل الاستخدام</span>
                </button>
                <button onClick={() => { setActiveSubScreen('about-system'); }}
                  className="w-full text-right p-3 bg-white border border-slate-300/50 hover:bg-sky-50 rounded-xl transition-all cursor-pointer flex flex-col justify-center items-center text-center gap-1 group">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-sky-600 text-2xl">info</span>
                  <span className="text-[10px] font-extrabold text-slate-700">حول النظام</span>
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 md:px-6 py-3 md:py-4 bg-slate-200 border-t border-slate-300 flex justify-center shrink-0">
            <button onClick={() => setShowLogOutDialog(true)}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-5 rounded-xl font-bold text-xs transition-all shadow-md hover:shadow-red-500/10 active:scale-[0.98] cursor-pointer min-h-[44px]">
              <span className="material-symbols-outlined text-sm font-bold">logout</span>
              تسجيل الخروج الآمن من النظام
            </button>
          </div>
        </div>
      </div>

      {activeSubScreen !== null && (
        <div className="fixed inset-0 bg-gray-950/75 backdrop-blur-md z-[110] flex items-end md:items-center justify-center p-0 md:p-4 overflow-y-auto">
          <div className="bg-white w-full md:max-w-2xl rounded-t-3xl md:rounded-2xl shadow-2xl border-0 md:border border-slate-300 overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh] text-right dir-rtl animate-in slide-in-from-bottom md:zoom-in-95 duration-200 safe-bottom">
            <div className="px-4 md:px-6 py-3 md:py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-lg md:text-xl">
                  {activeSubScreen === 'user-management' && 'person_search'}
                  {activeSubScreen === 'audit-logs' && 'policy'}
                  {activeSubScreen === 'operator-management' && 'cell_tower'}
                  {activeSubScreen === 'storage-management' && 'warehouse'}
                  {activeSubScreen === 'system-health' && 'dns'}
                  {activeSubScreen === 'backup-restore' && 'backup'}
                  {activeSubScreen === 'permissions-roles' && 'badge'}
                  {activeSubScreen === 'integrations' && 'api'}
                  {activeSubScreen === 'support-center' && 'contact_support'}
                  {activeSubScreen === 'help-guide' && 'help_outline'}
                  {activeSubScreen === 'about-system' && 'info'}
                </span>
                <span className="font-bold text-[11px] md:text-xs truncate max-w-[200px] md:max-w-none">
                  {activeSubScreen === 'user-management' && 'إدارة مستخدمي ومسؤولي النظام'}
                  {activeSubScreen === 'audit-logs' && 'سجلات الرقابة والتدقيق الأمني المباشر'}
                  {activeSubScreen === 'operator-management' && 'إدارة شبكات ومزودي خدمات الاتصالات'}
                  {activeSubScreen === 'storage-management' && 'إدارة مستودعات مخازن الشرائح'}
                  {activeSubScreen === 'system-health' && 'صحة البنية التحتية للخوادم'}
                  {activeSubScreen === 'backup-restore' && 'النسخ الاحتياطي والأرشفة الجنائية'}
                  {activeSubScreen === 'permissions-roles' && 'مصفوفة الأدوار والصلاحيات الوظيفية'}
                  {activeSubScreen === 'integrations' && 'تكامل بوابات الدفع والربط الخارجي API'}
                  {activeSubScreen === 'support-center' && 'مركز اتصال الدعم الفني والمراسلة'}
                  {activeSubScreen === 'help-guide' && 'الدليل الإرشادي والتعليمات التوضيحية'}
                  {activeSubScreen === 'about-system' && 'حول نظام إدارة تسييل وتوزيع الشرائح'}
                </span>
              </div>
              <button onClick={() => setActiveSubScreen(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white cursor-pointer touch-target">
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto space-y-3 md:space-y-4 text-slate-800 select-text">
              {activeSubScreen === 'user-management' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] text-slate-500">مستخدمين مؤهلين للولوج لنظام يمن تليكوم الأعلى للاتصالات.</p>
                    <button onClick={() => {
                      const name = prompt('أدخل اسم المستخدم الجديد:');
                      const email = prompt('أدخل البريد الإلكتروني للمسؤول:');
                      const role = prompt('أدخل الدور الوظيفي (مثال: مشرف مبيعات):');
                      if (name && email && role) {
                        setSimulatedUsers(prev => [...prev, { id: `usr-${Math.floor(105 + Math.random() * 900)}`, name, email, role, status: 'نشط', lastActive: 'الآن' }]);
                      }
                    }} className="text-[10px] bg-secondary text-white px-2.5 py-1 rounded-lg font-bold hover:brightness-110 cursor-pointer">+ إضافة حساب مسؤول جديد</button>
                  </div>
                  <div className="border border-slate-300 rounded-xl overflow-hidden divide-y divide-slate-200 text-[11px]">
                    {simulatedUsers.map(user => (
                      <div key={user.id} className="p-3 bg-white hover:bg-slate-950 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{user.name}</p>
                          <p className="text-slate-400 text-[10px] font-mono mt-0.5">{user.email} • ID: {user.id}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 font-semibold">{user.role}</span>
                          <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold ${user.status === 'نشط' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{user.status}</span>
                          <button onClick={() => { setSimulatedUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: u.status === 'نشط' ? 'محتجز' : 'نشط' } : u)); }}
                            className="text-[9px] text-red-600 hover:underline font-bold">تعديل</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSubScreen === 'audit-logs' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <p className="text-xs sm:text-[11px] text-slate-500 dark:text-slate-400">سجل تعقب الأحداث في الخادم للمسؤولين وحراس الأمان بالموقع.</p>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full font-mono font-bold shrink-0">7 سجلات</span>
                  </div>
                  <div className="bg-gray-950 p-3 sm:p-4 rounded-xl font-mono text-[10px] sm:text-[11px] leading-relaxed overflow-y-auto max-h-[50vh] min-h-[200px] space-y-1.5 dir-ltr text-left border border-slate-800/40">
                    {[
                      '[01-06-2026 01:21:04] SYSINFO: Server started on port 3000.',
                      '[01-06-2026 01:18:45] MONITOR: Warning — SIM allocation limit reached in Central Sanaa.',
                      '[01-06-2026 01:14:02] SECURITY: Root permission token accessed by ahmedabdos424@gmail.com (IP: 10.144.152.8).',
                      '[01-06-2026 01:06:46] AUDIT: PDF report of 20 Authorized agents generated.',
                      '[01-06-2026 00:55:12] DB_MUTATION: Simulated agents database synced.',
                      '[01-06-2026 00:30:19] SECURITY: 2-Factor Authentication validated.',
                      '[01-06-2026 00:00:00] SYSTEM: Daily health check passed.'
                    ].map((line, i) => {
                      const parts = line.match(/\[(.*?)\]\s+(\w+):\s+(.*)/);
                      if (!parts) return <p key={i} className="text-slate-400">{line}</p>;
                      return <p key={i} className="text-slate-400"><span className="text-slate-600">[{parts[1]}]</span> <span className={parts[2] === 'SECURITY' ? 'text-red-400' : parts[2] === 'AUDIT' ? 'text-emerald-400' : parts[2] === 'MONITOR' ? 'text-yellow-300' : 'text-cyan-400'}>{parts[2]}</span>: <span className="text-gray-300">{parts[3]}</span></p>;
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs sm:text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">ملفات الجرد المفرزة: <strong className="text-slate-800 dark:text-slate-200">54,233 واصفة</strong></span>
                    <button onClick={() => {
                      const logContent = `===== Audit Log - Yemen Telecom =====\nDate: ${new Date().toISOString()}\n${['[01-06-2026 01:21:04] SYSINFO: Server started', '[01-06-2026 01:18:45] MONITOR: SIM allocation limit', '[01-06-2026 01:14:02] SECURITY: Root token accessed', '[01-06-2026 01:06:46] AUDIT: PDF report generated', '[01-06-2026 00:55:12] DB_MUTATION: Agents DB synced', '[01-06-2026 00:30:19] SECURITY: 2FA validated'].join('\n')}\n===== END =====`;
                      const blob = new Blob([logContent], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `audit_log_${new Date().toISOString().slice(0,10)}.log`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }} className="text-secondary dark:text-red-400 font-bold hover:underline cursor-pointer py-1.5 px-2 -my-1.5 -mx-2 whitespace-nowrap">
                      <span className="material-symbols-outlined text-sm align-middle ml-1">download</span> تنزيل السجل الكامل
                    </button>
                  </div>
                </div>
              )}

              {activeSubScreen === 'operator-management' && (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-500">إدارة تكامل أبراج الاتصالات والترددات الخاصة بالخدمة وبناء الحزم.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { name: 'Yemen Mobile', desc: 'مشغل CDMA/4G/5G الأعلى', subs: '10.2M مشترك نشط', latency: '14ms' },
                      { name: 'Sabafon', desc: 'مشغل GSM الذكي الأول', subs: '5.4M مشترك نشط', latency: '21ms' },
                      { name: 'YOU Telecom', desc: 'بوابة 4G السريعة المتكاملة', subs: '4.9M مشترك نشط', latency: '18ms' }
                    ].map(op => (
                      <div key={op.name} className="p-4 bg-slate-950 border border-slate-300 rounded-xl space-y-2">
                        <div className="flex justify-between items-center"><span className="font-bold text-slate-900 text-xs">{op.name}</span><span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span></div>
                        <p className="text-[10px] text-slate-400">{op.desc}</p>
                        <p className="text-xs font-bold font-mono text-slate-800 mt-2">{op.subs}</p>
                        <p className="text-[10px] text-slate-500">زمن الاستجابة: {op.latency}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-red-50 text-red-800 border-red-200 text-[10px] rounded-lg font-bold">⚠️ نظام توزيع الشرائح الآمن يرتبط أوتوماتيكياً عبر الـ Webhook.</div>
                </div>
              )}

              {activeSubScreen === 'storage-management' && (
                <div className="space-y-3 col-span-2">
                  <p className="text-[11px] text-slate-500">تتبع توزيع مستودعات يمن تليكوم الفرعية ومراقبة مؤشرات السعة المتبقية.</p>
                  <div className="space-y-2 text-[11px]">
                    {[
                      { name: 'مستودع أمانة العاصمة الرئيسي', pct: 74.3, color: 'bg-secondary' },
                      { name: 'مستودع عدن المركزي (كريتر)', pct: 63, color: 'bg-sky-600' },
                      { name: 'مستودع تعز (الحوبان والمحيط)', pct: 10.25, color: 'bg-red-600', critical: true }
                    ].map(w => (
                      <div key={w.name} className="p-3 bg-white border border-slate-700 rounded-xl">
                        <div className="flex justify-between font-bold mb-1 text-slate-900"><span>{w.name}</span><span>{Math.round(w.pct * 1000 / 100)} / 100,000 شريحة</span></div>
                        <div className="w-full bg-slate-300 h-2 rounded-full overflow-hidden"><div className={`${w.color} h-full rounded-full`} style={{ width: `${w.pct}%` }}></div></div>
                        {(w as any).critical && <span className="text-[9px] text-red-600 font-bold mt-1 inline-block">⚠️ مخزون حرج! يلزم التزويد فوراً.</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSubScreen === 'backup-restore' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 border border-slate-300 rounded-xl space-y-3">
                    <h4 className="font-bold text-xs text-slate-950">توليد نسخة أمنية مشفرة</h4>
                    <p className="text-[11px] text-slate-500 leading-normal">سيقوم الخادم بحشد قاعدة البيانات بالكامل وضغطها ثم تشفيرها.</p>
                    {backupProgress !== null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-secondary font-mono"><span>جاري الأرشفة...</span><span>{backupProgress}%</span></div>
                        <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden"><div className="bg-secondary h-full rounded-full transition-all duration-150" style={{ width: `${backupProgress}%` }}></div></div>
                      </div>
                    )}
                    {backupStatus === 'completed' && <div className="p-2 bg-green-50 text-green-800 border border-green-200 rounded-lg text-[10px] font-semibold">✓ تم حزم النسخة الاحتياطية بنجاح.</div>}
                    <button onClick={runBackupSimulation} disabled={backupStatus === 'running'}
                      className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
                      <span className="material-symbols-outlined text-sm">backup</span>
                      {backupStatus === 'running' ? 'جاري...' : 'إجراء نسخ احتياطي'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-[11px] text-slate-500">ملفات الأرشيف المتوفرة:</h4>
                    <div className="border border-slate-700 rounded-xl divide-y divide-slate-300 text-[10.5px]">
                      {backupsList.map((bk, i) => (
                        <div key={i} className="p-3 bg-white hover:bg-slate-950 flex justify-between items-center font-mono">
                          <div><p className="font-bold text-slate-900 text-xs">{bk.name}</p><p className="text-[10px] text-slate-400 mt-1">{bk.date} • {bk.size}</p></div>
                          <button onClick={() => alert(`بدء تحميل ${bk.name}`)} className="text-secondary hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer">
                            <span className="material-symbols-outlined text-sm">download</span> تنزيل
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSubScreen === 'permissions-roles' && (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-500">التحقق من توزيع صلاحيات الإدارة العليا.</p>
                  <div className="space-y-3">
                    {Object.entries(rolePermissions).map(([key, role]: [string, any]) => (
                      <div key={key} className="p-3.5 bg-slate-950 rounded-xl border border-slate-300 space-y-2">
                        <div className="flex justify-between items-center border-b border-slate-300/50 pb-1.5">
                          <span className="font-bold text-slate-900 text-xs">
                            {key === 'admin' ? '👤 مسؤول ومراقب النظام (Super Admin)' : key === 'supervisor' ? '💼 مشرف المبيعات' : '🔍 مفتش الجودة'}
                          </span>
                          <span className="text-[10.5px] text-slate-500 font-medium">{role.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                          {['read', 'write', 'delete', 'suspend'].map(p => (
                            <label key={p} className="inline-flex items-center gap-1.5 bg-white border border-slate-300 px-2 py-1 rounded-md">
                              <input type="checkbox" checked={role[p]} readOnly className="accent-secondary" />
                              <span>{p === 'read' ? 'قراءة' : p === 'write' ? 'تعديل' : p === 'delete' ? 'حذف' : 'تجميد'}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSubScreen === 'integrations' && (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-500">ربط خوادم يمن تليكوم بالـ APIs الرسمية.</p>
                  <div className="space-y-2.5">
                    {activeWebhooks.map((wh, idx) => (
                      <div key={idx} className="p-3 bg-white border border-slate-300/70 rounded-xl flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="font-extrabold text-[11px] text-slate-950 block">{wh.name}</span>
                          <span className="font-mono text-[9px] text-slate-400 select-all block">{wh.url}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${wh.active ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span>
                          <button onClick={() => { setActiveWebhooks(prev => prev.map((w, i) => i === idx ? { ...w, active: !w.active } : w)); }}
                            className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${wh.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                            {wh.active ? 'تعطيل' : 'تفعيل'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSubScreen === 'support-center' && (
                <div className="space-y-3.5">
                  <p className="text-[11px] text-slate-500">مركز المساعدة والاتصال الموثق.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                    <div className="p-4 bg-slate-950 border border-slate-700 rounded-xl space-y-1">
                      <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1"><span className="material-symbols-outlined text-secondary text-sm">phone_in_talk</span> رقم هاتف الدعم</h4>
                      <p className="font-mono font-bold text-slate-700">800-TELESYSTEM</p>
                      <p className="text-[10px] text-slate-500">متاح 24 ساعة للبلاغات الأمنية.</p>
                    </div>
                    <div className="p-4 bg-slate-950 border border-slate-700 rounded-xl space-y-1">
                      <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1"><span className="material-symbols-outlined text-secondary text-sm">mail</span> البريد الأمني</h4>
                      <p className="font-mono font-bold text-slate-700">security-audit@telecom.ye</p>
                      <p className="text-[10px] text-slate-500">لتبادل مستندات الفرز والمحاسبة.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeSubScreen === 'help-guide' && (
                <div className="space-y-4">
                  <div className="space-y-3 text-[11px] leading-relaxed text-slate-700">
                    <h4 className="font-bold text-xs text-slate-950">كتيب الإجراءات الوقائية:</h4>
                    <p>١. <strong>تسييل الهويات:</strong> يجب على المسؤولين الرقابة على البائعين للتحقق من عدم تفعيل عدة شرائح لنفس الهوية.</p>
                    <p>٢. <strong>الجرد والتوزيع:</strong> توزيع كتلة الشرائح بطلب رسمي موثق من المركز المالي.</p>
                    <p>٣. <strong>التنبيهات الأمنية:</strong> عند استلام تنبيه عالي الخطورة، يتم تجميد حساب الوكيل المشتبه به احترازياً.</p>
                  </div>
                </div>
              )}

              {activeSubScreen === 'about-system' && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-secondary-container text-white text-3xl font-extrabold flex items-center justify-center rounded-full mx-auto shadow-md shadow-secondary/20">S</div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-950 font-sans tracking-wide">نظام إدارة توزيع الشرائح</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">المؤسسة العامة للاتصالات - الجمهورية اليمنية</p>
                    <p className="text-[9px] text-slate-500 font-mono mt-2">V-2.4.0 (YEMEN-TELECOM-PROD)</p>
                  </div>
                  <div className="max-w-md mx-auto text-[10.5px] text-slate-500 leading-normal border-t border-slate-200 pt-4">
                    تم تطوير هذه اللوحة لمساعدة مديري الفروع على تتبع شبكات الوكلاء ونمو التوزيع للحد من التسييل غير القانوني.
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-200 flex justify-end shrink-0">
              <button onClick={() => setActiveSubScreen(null)}
                className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2 rounded-xl cursor-pointer">حسناً، فهمت ذلك</button>
            </div>
          </div>
        </div>
      )}

      {showLogOutDialog && (
        <div className="fixed inset-0 bg-gray-950/75 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-right dir-rtl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-red-600">
              <span className="material-symbols-outlined text-2xl font-bold">warning</span>
              <h4 className="font-extrabold text-sm">تأكيد تسجيل الخروج</h4>
            </div>
            <p className="text-xs text-slate-600 leading-normal">هل أنت متأكد من رغبتك في تسجيل الخروج من النظام حالياً؟</p>
            <div className="flex gap-2.5 pt-2">
              <button onClick={() => { setShowLogOutDialog(false); setIsMoreOpen(false); if (onLogout) onLogout(); }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer">نعم، تسجيل الخروج</button>
              <button onClick={() => setShowLogOutDialog(false)}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-750 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer">تراجع</button>
            </div>
          </div>
        </div>
      )}

      {logoutMessageVisible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[130] bg-slate-950 text-white shadow-2xl border border-slate-800 rounded-xl px-5 py-3 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top duration-200">
          <span className="material-symbols-outlined text-green-500 font-bold">check_circle</span>
          <span>تم تسجيل الخروج من جلسة الإدارة الآمنة.</span>
        </div>
      )}
    </>
  );
}
