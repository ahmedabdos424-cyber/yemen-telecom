/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ViewType } from '../types';
import ProfileAvatar from './shared/ProfileAvatar';
import { LogOut } from 'lucide-react';

interface Alert {
  id: string;
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  time?: string;
}

interface TopBarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  unresolvedAlertsCount: number;
  alerts?: Alert[];
  displayName?: string;
  role?: string;
  onLogout?: () => void;
}

export default function TopBar({
  currentView,
  setView,
  unresolvedAlertsCount,
  alerts = [],
  displayName,
  role,
  onLogout,
}: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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
      {/* Right items: Title */}
      <div className="flex items-center gap-2 md:gap-3">
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

          {/* Overlay backdrop to close notifications when clicking outside */}
          {showNotifications && (
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
          )}

          {/* Quick Notification Dropdown */}
          {showNotifications && (
            <div className="absolute left-0 right-0 sm:left-auto sm:-right-2 mx-2 sm:mx-0 sm:w-80 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden text-right animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                  {unresolvedAlertsCount} تنبيه نشط
                </span>
                <h4 className="font-bold text-sm text-gray-800">التنبيهات الفورية</h4>
              </div>
              <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-4 text-center">
                    <span className="material-symbols-outlined text-gray-300 text-2xl">notifications_off</span>
                    <p className="text-xs text-gray-400 mt-1">لا توجد تنبيهات نشطة</p>
                  </div>
                ) : (
                  alerts.slice(0, 5).map((alert) => (
                    <div 
                      key={alert.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => { setView('alerts'); setShowNotifications(false); }}
                    >
                      <div className="flex gap-2.5 items-start">
                        <span className={`material-symbols-outlined mt-0.5 ${
                          alert.priority === 'high' ? 'text-red-500' : alert.priority === 'medium' ? 'text-orange-500' : 'text-blue-500'
                        }`}>
                          {alert.priority === 'high' ? 'warning' : alert.priority === 'medium' ? 'content_copy' : 'info'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-gray-900 leading-tight truncate">{alert.title}</p>
                          {alert.description && (
                            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{alert.description}</p>
                          )}
                          {alert.time && (
                            <span className="text-[10px] text-gray-400 block mt-1">{alert.time}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="text-right hidden sm:block">
              <p className="text-[11px] md:text-xs font-bold text-gray-900">{displayName || 'المستخدم'}</p>
            </div>
            <ProfileAvatar
              photo=""
              name={displayName || 'المستخدم'}
              onPhotoChange={() => {}}
              onPhotoDelete={() => {}}
              size={28}
              editable={false}
            />
          </button>

          {/* Profile dropdown */}
          {showProfileMenu && (
            <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
          )}
          {showProfileMenu && (
            <div className="absolute left-0 top-full mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden text-right animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-[11px] font-bold text-gray-900 truncate">{displayName || 'المستخدم'}</p>
                <p className="text-[10px] text-gray-500">{role === 'manager' ? 'مدير النظام' : 'مشرف'}</p>
              </div>
              {onLogout && (
                <button
                  onClick={() => { setShowProfileMenu(false); onLogout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  تسجيل الخروج
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
