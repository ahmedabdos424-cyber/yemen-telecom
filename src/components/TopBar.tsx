/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ViewType } from '../types';

interface TopBarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  onMenuToggle: () => void;
  unresolvedAlertsCount: number;
}

export default function TopBar({
  currentView,
  setView,
  onMenuToggle,
  unresolvedAlertsCount
}: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const getTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'لوحة التحكم المركزية';
      case 'sims':
        return 'إدارة الشرائح والمخزون';
      case 'agents':
        return 'إدارة الوكلاء المعتمدين';
      case 'sellers':
        return 'إدارة ومتابعة البائعين';
      case 'alerts':
        return 'تنبيهات النظام والمراقبة الفورية';
      case 'duplicate-identities':
        return 'مراقبة الهويات المتكررة والمخاطر';
      case 'reports':
        return 'مركز التقارير المتقدمة';
      case 'settings':
        return 'إعدادات النظام والأمان';
      case 'add-agent':
        return 'إضافة وكيل نظام جديد';
      default:
        return 'نظام توزيع الشرائح';
    }
  };

  return (
    <header className="fixed top-0 safe-top left-0 right-0 z-40 bg-white border-b border-gray-200 flex justify-between items-center h-12 md:h-16 px-3 md:px-8">
      {/* Right items: Title & Mobile menu button */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile menu button - hamburger for mobile */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer touch-target"
          aria-label="القائمة"
        >
          <span className="material-symbols-outlined text-xl">menu</span>
        </button>
        <span className="material-symbols-outlined text-secondary text-xl md:text-2xl hidden md:inline-block">
          admin_panel_settings
        </span>
        <h1 className="font-headline-md text-sm md:text-lg font-bold text-gray-900 truncate max-w-[140px] md:max-w-none">
          {getTitle().length > 20 ? getTitle().slice(0, 18) + '...' : getTitle()}
          <span className="text-gray-400 text-[10px] md:text-xs font-normal hidden sm:inline-block"> | مدير النظام</span>
        </h1>
      </div>

      {/* Left items: Navigation helpers, Notifications, Profiles */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Help button */}
        <button 
          onClick={() => setView('settings')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-body-sm text-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">help_outline</span>
          الدعم والتعليمات
        </button>

        {/* Notifications badge */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 md:p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-all flex items-center justify-center relative active:scale-95 cursor-pointer touch-target"
          >
            <span className="material-symbols-outlined text-xl md:text-2xl">notifications</span>
            {unresolvedAlertsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 md:w-5 md:h-5 bg-secondary text-white rounded-full flex items-center justify-center text-[8px] md:text-[10px] font-bold border-2 border-white">
                {unresolvedAlertsCount}
              </span>
            )}
          </button>

          {/* Quick Notification Dropdown */}
          {showNotifications && (
            <div className="absolute left-0 right-0 sm:left-auto mx-2 sm:mx-0 sm:w-80 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden text-right animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                  {unresolvedAlertsCount} تنبيه نشط
                </span>
                <h4 className="font-bold text-sm text-gray-800">التنبيهات الفورية</h4>
              </div>
              <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                <div 
                  className="p-3 hover:bg-red-50/50 cursor-pointer transition-colors"
                  onClick={() => { setView('alerts'); setShowNotifications(false); }}
                >
                  <div className="flex gap-2.5 items-start">
                    <span className="material-symbols-outlined text-secondary mt-0.5">warning</span>
                    <div className="flex-1">
                      <p className="font-bold text-xs text-gray-900 leading-tight">نقص حاد في المخزون - صنعاء</p>
                      <p className="text-[11px] text-gray-500 mt-1 lines-clamp-2">وصلت كمية شرائح SIM المتوفرة لأقل من 5%.</p>
                      <span className="text-[10px] text-gray-400 block mt-1">منذ دقيقتين</span>
                    </div>
                  </div>
                </div>
                <div 
                  className="p-3 hover:bg-orange-50/50 cursor-pointer transition-colors"
                  onClick={() => { setView('duplicate-identities'); setShowNotifications(false); }}
                >
                  <div className="flex gap-2.5 items-start">
                    <span className="material-symbols-outlined text-orange-600 mt-0.5">security_risk</span>
                    <div className="flex-1">
                      <p className="font-bold text-xs text-gray-900 leading-tight">اشتباه هويات مكررة</p>
                      <p className="text-[11px] text-gray-500 mt-1 lines-clamp-2">تم تسجيل نفس الهوية في 15 عملية تفعيل مؤخراً.</p>
                      <span className="text-[10px] text-gray-400 block mt-1">منذ ساعة</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-2 border-t border-gray-100 bg-gray-50 flex">
                <button
                  onClick={() => { setView('alerts'); setShowNotifications(false); }}
                  className="w-full text-center py-1.5 text-xs text-secondary hover:underline font-bold"
                >
                  عرض جميع التنبيهات
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div className="w-px h-5 md:h-6 bg-gray-300 hidden sm:block"></div>

        {/* Admin profile user header */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] md:text-xs font-bold text-gray-900">أحمد محمد</p>
            <p className="text-[9px] md:text-[10px] text-gray-500">مسؤول النظام الأعلى</p>
          </div>
          <div className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-sm border border-gray-200 shadow-sm relative overflow-hidden">
            <img 
              alt="ملف المستخدم المسؤول" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCskPTg0PPt134f9p13mCzkurWQRaKjB9oG-ODRUL4yGslUGe3gc49dgWXjadKNc1GhkThpYh_UR2ce30F9FPF0BANll_oXB7ibrsezX6gFA2mKnWZrNzjAkY4Rs_7VSgASqoMJRtnHsAvdKh7xbpzvqwKVoxQXnk61yDBkwzrzyHlH0at8UxveZxpdpx4iw8h3PD9RbA_cqCknn4G82OG5pzF6X--okNJDoBUvo4wU8UyqVtxhc_XGOCHM6ExxQYvEPgdhW_qKmPM"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
