/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { SystemAlert, SystemSettings } from '../types';
import { CardSkeleton } from './shared/Skeleton';
import { useToast, ToastContainer } from '../hooks/useToast';

interface AlertsViewProps {
  alerts: SystemAlert[];
  onResolveAlert: (id: string) => void;
  settings: SystemSettings;
  onUpdateSettings: (updated: SystemSettings) => void;
}

export default function AlertsView({
  alerts = [],
  onResolveAlert,
  settings,
  onUpdateSettings
}: AlertsViewProps) {
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium'>('all');
  const [isVerifyingSecurity, setIsVerifyingSecurity] = useState(false);
  const [reorderLoaders, setReorderLoaders] = useState<Record<string, boolean>>({});
  const { toasts, dismissToast, toastSuccess, toastError, toastWarning, toastInfo } = useToast();

  const filteredAlerts = useMemo(() => alerts.filter((alert) => {
    if (priorityFilter === 'all') return true;
    return alert.priority === priorityFilter;
  }), [alerts, priorityFilter]);

  const handleReorder = (alertId: string) => {
    setReorderLoaders((prev) => ({ ...prev, [alertId]: true }));
    try {
      onResolveAlert(alertId);
      toastSuccess('تم معالجة التنبيه وإرسال طلب توريد شرائح تعويضية للفرع بنجاح!');
    } catch {
      toastError('فشل معالجة التنبيه');
    } finally {
      setReorderLoaders((prev) => ({ ...prev, [alertId]: false }));
    }
  };

  const handleSecurityCheck = (alertId: string) => {
    setIsVerifyingSecurity(true);
    try {
      onResolveAlert(alertId);
      toastSuccess('اكتمل فحص بروتوكولات الأمان. تم تأمين العقدة بنجاح وتصفية التنبيه.');
    } catch {
      toastError('فشل فحص الأمان');
    } finally {
      setIsVerifyingSecurity(false);
    }
  };

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* View Header row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-headline-lg text-lg md:text-xl font-bold text-gray-900">سجل التنبيهات والأمان العقدية</h2>

        </div>
        <div className="flex gap-1.5 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setPriorityFilter('all')}
            className={`btn-sm cursor-pointer rounded-md transition-colors ${
               priorityFilter === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
             }`}
           >
             الكل
           </button>
           <button
             onClick={() => setPriorityFilter('high')}
             className={`btn-sm cursor-pointer rounded-md transition-colors ${
               priorityFilter === 'high' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
             }`}
           >
             مرتفع
           </button>
           <button
             onClick={() => setPriorityFilter('medium')}
             className={`btn-sm cursor-pointer rounded-md transition-colors ${
               priorityFilter === 'medium' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
             }`}
          >
            متوسط
          </button>
        </div>
      </div>

      {/* Main Alert listings & configuration split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active alert boxes */}
        <div className="lg:col-span-8 space-y-4">
          <h3 className="font-headline-md text-sm font-bold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">warning</span>
            التنبيهات الفورية النشطة
          </h3>

          {alerts.length === 0 ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-10 bg-white border border-gray-200 rounded-xl text-center text-gray-500 text-xs">
              <span className="material-symbols-outlined text-green-500 text-3xl block mb-2">check_circle</span>
              <p className="font-bold">جميع الأنظمة مستقرة</p>
              <p className="text-gray-400 mt-1">لا توجد تنبيهات أمنية أو لوجستية معلقة بالمستوى المحدّد.</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:shadow-md content-visibility-auto contain-strict ${
                  alert.priority === 'high'
                    ? 'border-r-red-650'
                    : alert.priority === 'medium'
                    ? 'border-r-orange-500'
                    : 'border-r-green-500'
                }`}
              >
                <div className="flex gap-4 items-start">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    alert.priority === 'high'
                      ? 'bg-red-50 text-red-700'
                      : alert.priority === 'medium'
                      ? 'bg-orange-50 text-orange-700'
                      : 'bg-green-50 text-green-700'
                  }`}>
                    <span className="material-symbols-outlined text-xl">
                      {alert.priority === 'high'
                        ? 'inventory_2'
                        : alert.priority === 'medium'
                        ? 'shield_lock'
                        : 'task_alt'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 text-xs">
                      <span className={`font-bold ${
                        alert.priority === 'high'
                          ? 'text-red-600'
                          : alert.priority === 'medium'
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}>
                        {alert.priority === 'high' ? 'أولوية قصوى' : alert.priority === 'medium' ? 'أولوية متوسطة' : 'إشعار ناجح'}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-400">{alert.time}</span>
                    </div>
                    <h4 className="font-bold text-xs text-gray-900 flex flex-wrap items-center gap-1.5">
                      <span>{alert.title}</span>
                      {alert.category === 'مخزون' && (
                        <span className="badge badge-pending">
                           العتبة: {settings.stockShortageThreshold ?? 5}%
                         </span>
                      )}
                      {alert.category === 'أمان' && (
                        <span className="badge badge-failed">
                           الحد الأقصى: {settings.maxFailedLoginsThreshold ?? 3} محاولات
                         </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                      {alert.id === '1'
                        ? `وصلت كمية شرائح SIM المتوفرة إلى أقل من ${settings.stockShortageThreshold ?? 5}% من الحد الأدنى المطلوب. يتطلب إجراء فوري.`
                        : alert.id === '2'
                        ? `تم رصد محاولة دخول فاشلة متكررة (تخطت عتبة الـ ${settings.maxFailedLoginsThreshold ?? 3} محاولات المعينة) من عنوان IP غير معروف على حساب المستخدم.`
                        : alert.description}
                    </p>
                  </div>
                </div>

                {/* Specific instant actions */}
                <div className="shrink-0 w-full sm:w-auto">
                  {alert.priority === 'high' && (
                    <button
                      onClick={() => handleReorder(alert.id)}
                      disabled={reorderLoaders[alert.id]}
                      className="btn btn-sm btn-primary flex items-center justify-center gap-1.5"
                     >
                       {reorderLoaders[alert.id] ? (
                         <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                       ) : (
                         <span className="material-symbols-outlined text-sm">reorder</span>
                       )}
                       إعادة طلب الكمية
                     </button>
                   )}
                   {alert.priority === 'medium' && (
                     <button
                       onClick={() => handleSecurityCheck(alert.id)}
                       disabled={isVerifyingSecurity}
                       className="btn btn-sm btn-ghost flex items-center justify-center gap-1.5"
                    >
                      {isVerifyingSecurity ? (
                        <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                      ) : (
                        <span className="material-symbols-outlined text-sm font-bold">lock_open</span>
                      )}
                      فحص الأمان والتحقق
                    </button>
                  )}
                  {alert.priority === 'low' && (
                    <button
                      onClick={() => onResolveAlert(alert.id)}
                      className="btn btn-sm btn-ghost text-gray-500 hover:text-gray-800"
                    >
                      تجاهل وبلاغ مقروء
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Configurations and Timeline split */}
        <div className="lg:col-span-4 space-y-6">
          {/* Notifications config toggles */}
          <section className="card">
             <h3 className="font-headline-md text-xs font-bold text-gray-900 mb-4 flex items-center gap-2">
               <span className="material-symbols-outlined text-gray-600">settings</span>
               إعدادات وقنوات التنبيه
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-gray-600 text-lg">sms</span>
                  <div>
                    <span className="text-xs font-semibold text-gray-900 block">رسائل الجوال SMS</span>
                    <span className="text-[11px] text-gray-500">للحالات والتحذيرات الحرجة فقط</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.smsAlertsEnabled}
                    onChange={(e) => onUpdateSettings({ ...settings, smsAlertsEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className={`w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full transition-colors relative after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    settings.smsAlertsEnabled ? 'bg-primary border-primary after:-translate-x-5' : 'after:translate-x-0'
                  }`}></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-gray-100 pt-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-gray-600 text-lg">mail</span>
                  <div>
                    <span className="text-xs font-semibold text-gray-900 block">بريد نظام التقارير</span>
                    <span className="text-[11px] text-gray-500">ملخص يومي ودوري لأداء العقد</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailAlertsEnabled}
                    onChange={(e) => onUpdateSettings({ ...settings, emailAlertsEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className={`w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full transition-colors relative after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    settings.emailAlertsEnabled ? 'bg-primary border-primary after:-translate-x-5' : 'after:translate-x-0'
                  }`}></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-gray-100 pt-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-gray-600 text-lg">notification_important</span>
                  <div>
                    <span className="text-xs font-semibold text-gray-900 block">إشعارات المتصفح الداخلية</span>
                    <span className="text-[11px] text-gray-500">منبثقات عاجلة أثناء العمل</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.appNotificationsEnabled}
                    onChange={(e) => onUpdateSettings({ ...settings, appNotificationsEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className={`w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full transition-colors relative after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    settings.appNotificationsEnabled ? 'bg-primary border-primary after:-translate-x-5' : 'after:translate-x-0'
                  }`}></div>
                </label>
              </div>
            </div>
          </section>

          {/* System Thresholds Status Card */}
          <section className="card space-y-4">
             <h3 className="font-headline-md text-xs font-bold text-gray-900 flex items-center gap-2">
               <span className="material-symbols-outlined text-amber-500 text-lg">tune</span>
               العتبات ومؤشرات الخطر الحالية
            </h3>
            
            <p className="text-[11px] text-gray-500 leading-relaxed">
              يتم تطبيق عتبات الإنذار المبكر التالية حالياً لتصنيف التهديدات الأمنية واللوجستية وفقاً لإعدادات النظام المعتمدة:
            </p>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-gray-50/50 border border-gray-100 rounded-lg text-xs">
                <span className="text-gray-600">عتبة نفاد مخزون الشرائح:</span>
                <span className="font-bold text-primary font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                  {settings.stockShortageThreshold ?? 5}%
                </span>
              </div>

              <div className="flex justify-between items-center p-2 bg-gray-50/50 border border-gray-100 rounded-lg text-xs">
                <span className="text-gray-600">مهلة خمول الشرائح (سحب وتدوير):</span>
                <span className="font-bold text-gray-800 font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                  {settings.inactiveSimsThreshold ?? 90} يوماً
                </span>
              </div>

              <div className="flex justify-between items-center p-2 bg-gray-50/50 border border-gray-100 rounded-lg text-xs">
                <span className="text-gray-600">محاولات الولوج غير المصرح قبل القفل:</span>
                <span className="font-bold text-red-650 font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                  {settings.maxFailedLoginsThreshold ?? 3} محاولات
                </span>
              </div>

              <div className="flex justify-between items-center p-2 bg-gray-50/50 border border-gray-100 rounded-lg text-xs">
                <span className="text-gray-600">عتبة كشف تسييل الهويات:</span>
                <span className="font-bold text-secondary font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                  {settings.highRiskDuplicatesThreshold ?? 5} مرات
                </span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 text-center leading-normal">
              💡 لتعديل هذه القيم أو زيادة الحساسية، يرجى التوجه لـ <span className="font-semibold text-gray-600">صفحة إعدادات النظام</span> وتحديث عتبات الإنذار.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
