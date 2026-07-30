/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { SystemSettings } from '../types';
import ConfirmModal from './shared/ConfirmModal';
import { captureError } from '../lib/monitor.ts';
import * as Sentry from '@sentry/react';
import { api } from '../api/client';
import { Trash2 } from 'lucide-react';
import { useToast, ToastContainer } from '../hooks/useToast';

interface SettingsViewProps {
  settings: SystemSettings;
  onUpdateSettings: (updated: SystemSettings) => void;
}

export default function SettingsView({ settings, onUpdateSettings }: SettingsViewProps) {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [localThreshold, setLocalThreshold] = useState(settings.highRiskDuplicatesThreshold ?? 5);
  const [lockdownConfirm, setLockdownConfirm] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toasts, dismissToast, toastError } = useToast();

  useEffect(() => {
    setLocalThreshold(settings.highRiskDuplicatesThreshold ?? 5);
  }, [settings.highRiskDuplicatesThreshold]);

  const handleDownloadAuditReport = async () => {
    try {
      const logs = await api.getAuditLogs();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `security_audit_report_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (error) {
      captureError(error, 'downloadAuditReport');
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const result = await api.createBackup();
      const link = document.createElement('a');
      link.href = api.downloadBackup(result.filename);
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      captureError(error, 'handleBackup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleLockdownConfirm = async () => {
    try {
      const result = await api.toggleLockdown();
      setLockdownConfirm(false);
      if (result.locked) {
        onUpdateSettings({ ...settings, maintenanceMode: true });
      } else {
        onUpdateSettings({ ...settings, maintenanceMode: false });
      }
    } catch (error) {
      captureError(error, 'handleLockdown');
      setLockdownConfirm(false);
    }
  };

  const handleToggle = (key: keyof SystemSettings) => {
    onUpdateSettings({
      ...settings,
      [key]: !settings[key]
    });
  };

  return (
    <div className="space-y-6">
      {/* Settings list dashboard split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left main configurations box */}
        <div className="lg:col-span-8 space-y-6">
          {/* Security Protocols Card */}
          <section id="settings-security-section" className="card">
            <h3 className="font-headline-md text-sm font-bold text-gray-950 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">security</span>
              بروتوكولات الأمان والولوج العقدي
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">المصادقة الثنائية الإلزامية (2FA)</span>
                  <span className="text-[11px] text-gray-500">إلزام جميع المدراء الإقليميين والموزعين بالرمز الإضافي عند الدخول.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.twoFAEnabled}
                    onChange={() => handleToggle('twoFAEnabled')}
                    className="sr-only peer"
                  />
                  <div className={`w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full transition-colors relative after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    settings.twoFAEnabled ? 'bg-primary border-primary after:-translate-x-5' : 'after:translate-x-0'
                  }`}></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-gray-100 pt-3">
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">تفعيل التحقق بخطوتين عبر البريد الإلكتروني</span>
                  <span className="text-[11px] text-gray-500">إرسال رمز تحقق مؤقت للبريد الإلكتروني المعتمد عند تسجيل الدخول من جهاز جديد.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.email2FAEnabled}
                    onChange={() => handleToggle('email2FAEnabled')}
                    className="sr-only peer"
                  />
                  <div className={`w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full transition-colors relative after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    settings.email2FAEnabled ? 'bg-primary border-primary after:-translate-x-5' : 'after:translate-x-0'
                  }`}></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-gray-100 pt-3">
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">إدارة الأجهزة الموثوقة</span>
                  <span className="text-[11px] text-gray-500">تمكين التعرف التلقائي على الأجهزة الموثوقة لتسهيل وتحصين عمليات الدخول السريعة.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.trustedDevicesEnabled}
                    onChange={() => handleToggle('trustedDevicesEnabled')}
                    className="sr-only peer"
                  />
                  <div className={`w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full transition-colors relative after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    settings.trustedDevicesEnabled ? 'bg-primary border-primary after:-translate-x-5' : 'after:translate-x-0'
                  }`}></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-gray-100 pt-3">
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">إجبار الرموز والمحارف الخاصة</span>
                  <span className="text-[11px] text-gray-500">تطلب كلمات مرور قوية من الوكلاء لتفادي التخمين والثغرات الهندسية.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.passwordSpecialRequired}
                    onChange={() => handleToggle('passwordSpecialRequired')}
                    className="sr-only peer"
                  />
                  <div className={`w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full transition-colors relative after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    settings.passwordSpecialRequired ? 'bg-primary border-primary after:-translate-x-5' : 'after:translate-x-0'
                  }`}></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-gray-100 pt-3">
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">إلغاء كلمات المرور تلقائياً كل 90 يوماً</span>
                  <span className="text-[11px] text-gray-500">إلزام الموزعين والمشترين بتحديث الرمز السري للوقاية من تسرب الحسابات.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.passwordExpiry90Days}
                    onChange={() => handleToggle('passwordExpiry90Days')}
                    className="sr-only peer"
                  />
                  <div className={`w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full transition-colors relative after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    settings.passwordExpiry90Days ? 'bg-primary border-primary after:-translate-x-5' : 'after:translate-x-0'
                  }`}></div>
                </label>
              </div>
            </div>
          </section>

          {/* Custom Thresholds and early warnings (عتبات التنبيه والإنذار المبكر) */}
          <section className="card">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-headline-md text-sm font-bold text-gray-950 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">warning_amber</span>
                إدارة عتبات التنبيه والإنذار المبكر
              </h3>
              <span className="text-[11px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                مستوى النظام العام
              </span>
            </div>
            
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              قم بضبط حدود الحساسية (Sensitivity Thresholds) التي تطلق التحذيرات الفورية في لوحة التحكم لمراقبة دقيقة للمخاطر وتدفق العمل التشغيلي:
            </p>

            <div className="space-y-6">
              {/* Threshold 1: SIM Stock Shortage */}
              <div className="border border-gray-100 rounded-lg p-3.5 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">عتبة نقص المخزون للشرائح</span>
                    <span className="text-[11px] text-gray-500 block">النسبة المئوية الدنيا للمخزون قبل إطلاق منبه حاد بالفروع.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={settings.stockShortageThreshold ?? 5}
                      onChange={(e) => onUpdateSettings({ ...settings, stockShortageThreshold: Number(e.target.value) })}
                      className="w-full sm:w-40 accent-primary h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer text-primary"
                    />
                    <span className="text-xs font-bold text-primary font-mono bg-white border border-gray-200 px-2 py-1 rounded min-w-[2.5rem] text-center">
                      {settings.stockShortageThreshold ?? 5}%
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-amber-800 bg-amber-50/50 p-2 rounded border border-amber-100/50 mt-1 lines-clamp-2">
                  💡 سيتم تنبيه إدارة الإمداد والتموين بمجرد تدني مخزون شرائح SIM في أي فرع عن <span className="font-bold">{settings.stockShortageThreshold ?? 5}%</span> من المخازن الاحتياطية المخصصة ليتم إعادة الطلب تلقائياً.
                </p>
              </div>

              {/* Threshold 2: SIM Inactivity Days */}
              <div className="border border-gray-100 rounded-lg p-3.5 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">مهلة خمول شرائح SIM</span>
                    <span className="text-[11px] text-gray-500 block">عدد الأيام المطلوبة بدون مبيعات/نشاط لرفع بلاغ ركود الشرائح.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const val = Math.max(10, (settings.inactiveSimsThreshold ?? 90) - 5);
                        onUpdateSettings({ ...settings, inactiveSimsThreshold: val });
                      }}
                      className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-bold font-mono transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="10"
                      max="360"
                      value={settings.inactiveSimsThreshold ?? 90}
                      onChange={(e) => onUpdateSettings({ ...settings, inactiveSimsThreshold: Math.max(1, Number(e.target.value)) })}
                      className="w-20 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-center text-xs font-bold font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = Math.min(365, (settings.inactiveSimsThreshold ?? 90) + 5);
                        onUpdateSettings({ ...settings, inactiveSimsThreshold: val });
                      }}
                      className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-bold font-mono transition-colors cursor-pointer"
                    >
                      +
                    </button>
                    <span className="text-xs text-gray-500 font-bold whitespace-nowrap">يوماً</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  تساعد هذه القيمة البائعين الإقليميين على سحب الأرقام من المنافذ الكسولة وإعادة فرزها للأماكن ذات الطلب المرتفع بعد مرور <span className="font-bold text-gray-800">{settings.inactiveSimsThreshold ?? 90} يوماً</span> من الانقطاع.
                </p>
              </div>

              {/* Threshold 3: Unauthorized Failed Logins */}
              <div className="border border-gray-100 rounded-lg p-3.5 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">عتبة محاولات الولوج الفاشلة</span>
                    <span className="text-[11px] text-gray-500 block">عدد المحاولات الخاطئة في تسجيل دخول الموزع قبل حظر هويته مؤقتاً.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={settings.maxFailedLoginsThreshold ?? 3}
                      onChange={(e) => onUpdateSettings({ ...settings, maxFailedLoginsThreshold: Number(e.target.value) })}
                      className="px-3 py-1 bg-white border border-gray-200 rounded text-xs font-bold font-mono outline-none cursor-pointer"
                    >
                      <option value="2">2 محاولات</option>
                      <option value="3">3 محاولات (موصى به)</option>
                      <option value="5">5 محاولات</option>
                      <option value="10">10 محاولات</option>
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-red-600 bg-red-50/50 p-2 rounded border border-red-100/50 mt-1">
                  ⚠️ عند تكرار الولوج الخاطئ لـ <span className="font-bold">{settings.maxFailedLoginsThreshold ?? 3} مرات</span> متتالية، سيتم حظر جلسة عنوان الـ IP وقفل حساب الموزع وإرسال بلاغ اختراق فوري لمدير الأمن السيبراني.
                </p>
              </div>

              {/* Threshold 4: High-Risk Identity Duplicates */}
              <div className="border border-gray-100 rounded-lg p-3.5 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">عتبة كشف تسييل الهويات (مؤشر الاحتيال)</span>
                    <span className="text-[11px] text-gray-550 block">الحد الأقصى لتكرار الرقم الوطني للهوية لدى باعة متباعدين جغرافياً.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="2"
                      max="50"
                      value={localThreshold}
                      onChange={(e) => setLocalThreshold(Math.max(2, Math.min(50, Number(e.target.value))))}
                      className="w-20 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-center text-xs font-bold font-mono outline-none shadow-sm focus:border-secondary focus:ring-1 focus:ring-secondary text-gray-900"
                    />
                    <span className="text-xs text-gray-500 font-medium whitespace-nowrap">مرات تكرار</span>
                  </div>
                </div>
                
                <p className="text-[11px] text-emerald-800 bg-emerald-50/80 p-2 rounded border border-emerald-100 mt-1 leading-relaxed mb-3">
                  🛡️ يقوم الذكاء الاصطناعي للبوابة بمسح السجلات وتصنيف العميل كـ "مرتفع الخطورة" وتجميد معاملاته فوراً إذا ربط هويته أكثر من <span className="font-bold">{settings.highRiskDuplicatesThreshold ?? 5} مرات</span> بمواقع متباعدة جغرافياً.
                </p>

                <div className="flex justify-end pt-2 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ ...settings, highRiskDuplicatesThreshold: localThreshold });
                    }}
                    className="btn btn-sm btn-primary"
                  >
                    تحديث قيم المخاطر
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Periodic Reminders for Suspicious Identities (تذكيرات المراجعة للمسؤولين) */}
          <section className="card space-y-4">
            <div className="flex justify-between items-center bg-gray-50/50 -m-5 mb-1 p-5 border-b border-gray-100 rounded-t-xl">
              <div>
                <h3 className="font-headline-md text-sm font-bold text-gray-950 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">notifications_active</span>
                  تذكيرات مراجعة ملفات الهوية المشبوهة
                </h3>
                <span className="text-[11px] text-gray-500 block mt-0.5">
                  تنبيه المراجعين والمسؤولين دورياً للتأكد من حسم ملفات الاحتيال وتسييل الهويات المعلقة.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.identityRemindersEnabled ?? false}
                  onChange={() => handleToggle('identityRemindersEnabled')}
                  className="sr-only peer"
                />
                <div className={`w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full transition-colors relative after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                  settings.identityRemindersEnabled ? 'bg-primary border-primary after:-translate-x-5' : 'after:translate-x-0'
                }`}></div>
              </label>
            </div>

            <div className={`space-y-4 transition-all duration-300 ${settings.identityRemindersEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50/20">
                <div>
                  <span className="text-xs font-bold text-gray-900 block">تردد إرسال التذكيرات</span>
                  <span className="text-[11px] text-gray-500 block">تحديد مدى تكرار نظام الإشعارات في توجيه التنبيه للمسؤولين.</span>
                </div>
                <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, identityRemindersFrequency: 'daily' })}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      settings.identityRemindersFrequency === 'daily'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-550 hover:text-gray-900'
                    }`}
                  >
                    يومي
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, identityRemindersFrequency: 'weekly' })}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      settings.identityRemindersFrequency === 'weekly'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-550 hover:text-gray-900'
                    }`}
                  >
                    أسبوعي
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-indigo-50/50 border border-indigo-100/60 text-[11px] text-gray-650 leading-relaxed">
                <span className="material-symbols-outlined text-indigo-500 text-sm mt-0.5 shrink-0">info</span>
                <div>
                  <p>
                    {settings.identityRemindersFrequency === 'daily' ? (
                      <span>⚙️ تم الضبط على: <strong className="text-indigo-900">إشعار يومي صباحي (الساعة 8:00 ص)</strong>. سيقوم خادم العمليات بفرز الهويات التي تعدت عتبة الخطر وتنبيه المراجعين لمراجعتها حرصاً على مكافحة التسييل جغرافياً أولاً بأول.</span>
                    ) : (
                      <span>⚙️ تم الضبط على: <strong className="text-indigo-900">تقرير أسبوعي (كل صباح أحد)</strong>. يلخص كافة أنشطة الاحتيال ورشاقات الولوج المشبوهة المتراكمة مع روابط مباشرة لاتخاذ إجراء سريع للتعطيل أو التأكيد.</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Infrastructure Settings */}
          <section className="card">
             <h3 className="font-headline-md text-sm font-bold text-gray-954 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-650">lan</span>
              إعدادات البنية والربط التقني
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">فترة انتهاء صلاحية الجلسة للمسؤولين</label>
                <select
                  value={settings.sessionTimeout}
                  onChange={(e) => onUpdateSettings({ ...settings, sessionTimeout: e.target.value })}
                  className="w-full sm:w-64 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none cursor-pointer"
                >
                  <option>10 دقائق</option>
                  <option>15 دقيقة</option>
                  <option>30 دقيقة</option>
                  <option>ساعة كاملة</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* Right fast administrative lock options */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Disaster Management locks */}
          <section className="card space-y-4">
             <h3 className="font-bold text-xs text-gray-900 flex items-center gap-2">
               <span className="material-symbols-outlined text-secondary">emergency_home</span>
               إدارة الطوارئ وحالة العقد
             </h3>

             <div>
               <p className="text-[11px] text-gray-550 leading-relaxed mb-3">
                 في حال الاشتباه بتهديد خارجي أو عطل لوجيستي مفاجئ، يمكنك استباق الخطر بالضغط على زر قفل الطوارئ لجميع الوكلاء والباعة التابعين للشركة.
               </p>
               
               <button
                 onClick={() => setLockdownConfirm(true)}
                 className="btn btn-primary w-full flex items-center justify-center gap-1.5 shadow-md shadow-red-200"
              >
                <span className="material-symbols-outlined text-sm font-bold">lock</span>
                قفل الطوارئ الإجمالي فوراً
              </button>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-[11px] text-gray-550 leading-relaxed mb-3">
                النسخ الاحتياطي التلقائي يتم دورياً، إلا أنه يمكنك مزامنة نسخة يدوية مشفّرة بشكل فوري الآن لضمان حفظ حالة الموزعين.
              </p>
              
              <button
                 onClick={handleBackup}
                 disabled={isBackingUp}
                 className="btn btn-ghost w-full flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm animate-none">
                  {isBackingUp ? 'sync' : 'cloud_sync'}
                </span>
                {isBackingUp ? 'جاري النسخ والترميز...' : 'أخذ نسخة احتياطية فورية'}
              </button>
            </div>
          </section>

          {/* Security Audit Reports Card */}
          <section className="card space-y-4">
             <h3 className="font-bold text-xs text-gray-900 flex items-center gap-2">
               <span className="material-symbols-outlined text-emerald-600">verified_user</span>
               تقارير التدقيق الأمني والتحركات
             </h3>
             <p className="text-[11px] text-gray-500 leading-relaxed">
               يمكنك تصدير وتحميل تقرير التحركات وسجلات الأمن السيبراني الأخيرة كملف JSON مشفر لأغراض المراجعة والامتثال.
             </p>
             <button
               onClick={handleDownloadAuditReport}
               className="btn w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200"
            >
              <span className="material-symbols-outlined text-sm font-bold">download</span>
              تحميل تقرير التدقيق الأمني
            </button>
          </section>

          {/* Maintenance Mode configuration */}
          <section className="bg-gray-150 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-900 block">وضع الصيانة الكلي للمخدم</span>
                <span className="text-[11px] text-gray-500">حجب الدخول عن الجميع لحين اكتمال الترقية</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={() => handleToggle('maintenanceMode')}
                  className="sr-only peer"
                />
                <div className={`w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full transition-colors relative after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                  settings.maintenanceMode ? 'bg-secondary border-secondary after:-translate-x-5' : 'after:translate-x-0'
                }`}></div>
              </label>
            </div>
          </section>
        </div>
      </div>

      {/* Delete Account Section */}
      <div className="mt-8 pt-6 border-t border-slate-800/40">
        <button
          type="button"
          onClick={() => setDeleteConfirmOpen(true)}
          className="w-full flex items-center justify-between p-4 bg-red-950/10 border border-red-900/20 rounded-2xl hover:bg-red-950/30 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 group-hover:scale-105 transition-transform">
              <Trash2 size={18} />
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-red-400">حذف الحساب</p>
              <p className="text-[10px] text-slate-500 mt-0.5">حذف الحساب وجميع البيانات المرتبطة به</p>
            </div>
          </div>
        </button>
      </div>

      <ConfirmModal
        open={lockdownConfirm}
        onConfirm={handleLockdownConfirm}
        onCancel={() => setLockdownConfirm(false)}
        title="🚨 تفعيل قفل الطوارئ"
        message="هل أنت متأكد من تفعيل قفل الطوارئ؟ سيؤدي هذا لتجميع جميع أجهزة الباعة المتنقلة فوراً!"
        confirmLabel="نعم، تفعيل القفل"
        cancelLabel="تراجع"
        variant="danger"
      />

      {/* Delete Account Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => { if (!deleting) setDeleteConfirmOpen(false); }}
          />
          <div className="relative w-full max-w-sm md:max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-200 z-10 text-right font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                  <Trash2 size={14} />
                </div>
                <h3 className="text-sm font-bold text-red-400">حذف الحساب</h3>
              </div>
              <button
                onClick={() => { if (!deleting) setDeleteConfirmOpen(false); }}
                className="p-2.5 text-slate-500 hover:text-slate-100 rounded-full transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                disabled={deleting}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="mb-6">
              <p className="text-xs text-slate-300 leading-relaxed">هل أنت متأكد من حذف الحساب؟ سيتم حذف جميع البيانات المرتبطة بهذا الحساب نهائياً ولا يمكن التراجع عن هذا الإجراء.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await api.deleteAccount();
                    localStorage.clear();
                    window.location.href = '/';
                  } catch {
                    toastError('لا يمكن حذف الحساب الحالي.\nيرجى التواصل مع مدير النظام.');
                    setDeleting(false);
                    setDeleteConfirmOpen(false);
                  }
                }}
                disabled={deleting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center disabled:opacity-50"
              >{deleting ? 'جاري الحذف...' : 'حذف'}</button>
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl border border-slate-700 transition-all cursor-pointer text-center"
              >إلغاء</button>
            </div>
          </div>
        </div>
      )}
      {import.meta.env.DEV && (
        <div className="mt-6 p-4 border border-dashed border-red-500/30 rounded-xl">
          <p className="text-xs text-red-400 mb-2">DEV: اختبار Sentry</p>
          <button
            onClick={() => { throw new Error('اختبار Sentry من الواجهة!'); }}
            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm rounded-lg transition-all"
          >
            🔥 اختبار خطأ Sentry
          </button>
        </div>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
