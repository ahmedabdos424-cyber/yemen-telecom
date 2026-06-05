import React from 'react';
import { Role } from '../types';
import { Home, PlusCircle, UserPlus, Users, Layers, ShieldCheck, Settings, LogOut } from 'lucide-react';

interface NavBarProps {
  role: Role;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  username: string;
  onLogout: () => void;
}

export default function NavBar({ role, activeTab, setActiveTab, username, onLogout }: NavBarProps) {
  // Define links depending on the logged-in role
  const isAgent = role === 'agent' || role === 'manager';

  const menuItems = isAgent
    ? [
        { id: 'home', label: 'الرئيسية', icon: Home },
        { id: 'activate', label: 'تفعيل شريحة', icon: PlusCircle },
        { id: 'add_seller', label: 'إضافة بائع', icon: UserPlus },
        { id: 'sellers', label: 'البائعين', icon: Users },
        { id: 'my_sims', label: 'شرائحي', icon: Layers },
        { id: 'account', label: 'بيانات الحساب', icon: ShieldCheck },
      ]
    : [
        { id: 'home', label: 'الرئيسية', icon: Home },
        { id: 'activate', label: 'تفعيل شريحة', icon: PlusCircle },
        { id: 'my_sims', label: 'شرائحي', icon: Layers },
        { id: 'account', label: 'بيانات الحساب', icon: ShieldCheck },
      ];

  return (
    <>
      {/* 1. Desktop Persistent Sidebar (On the RIGHT inside RTL layout) */}
      <aside className="hidden lg:flex flex-col fixed right-0 top-0 h-screen bg-slate-900 border-l border-slate-800 w-70 text-slate-100 z-40 p-5 pt-20 justify-between">
        <div className="space-y-6">
          {/* Brand Panel */}
          <div className="flex items-center gap-3 px-3 py-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
            <div className="w-11 h-11 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <span className="material-symbols-outlined text-[24px]">leak_add</span>
            </div>
            <div className="text-right">
              <h3 className="font-bold text-sm tracking-tight text-white">نظام التوزيع الموحد</h3>
              <p className="text-[10px] text-slate-400 font-light translate-y-0.5">منصة الشرائح الذكية</p>
            </div>
          </div>

          {/* Logged in User Profile Info */}
          <div className="flex flex-col items-center px-4 py-5 bg-slate-950/30 rounded-2xl border border-slate-800/20 text-center">
            <div className="w-14 h-14 rounded-full border-2 border-red-600 p-0.5 mb-3 overflow-hidden shadow-lg shadow-red-950/10">
              <img 
                alt={username}
                src={
                  isAgent
                    ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9hEiGBZLQzVZP4scYfo4sA80Ab8uKRYSP_bNQcLqRoHw4Q07TqXqRhc4tf_VN6dDT7rQDBO1BgNrEen7e8tNGT3o95su2G5mtFX7cjFo2-a7TpgqINjMwEygao3cgIyS24rfhdIip4JBZC3iQGMiEwtZaZRFf6MTaqnOuxp5Vt316wbaFNJ93vk8oE1fkjK-4P4-330UzYu28FQVb6yKEGG8KXvTC297y0K_P6zYIPvvn2Yi-p7wROhrchJY15Pdy0FoIZcH87v8'
                    : 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgz0srZX-fPTwrxphx6G-akOy2GKiaTrQYzHnp-47B3NYt2mOSmwRFetXfAXjkf47AGQwrVI7G6DK9bUagM6bRnQSANx7qimdKsdaA0EN8E6LCNHGgA8yQyx52j35ju6Koq_DAbeLPyKtMyX_V7FrARDH8pKlnSxB2D9iI7kriW-BylMZGFWZ513V_p0b7hFvnMxxpB13I9qjAgvyTY428duG4S_kNTi8m7wsUh-pcXE3VvCSRGQC5tXx87uBlg8XxFTURrPDKtKc'
                }
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <p className="font-bold text-sm text-slate-100">{username}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{role === 'manager' ? 'مدير النظام' : role === 'agent' ? 'الوكيل الإقليمي' : 'بائع معتمد'}</p>
            <span className="text-[9px] font-mono font-bold bg-[#141d2e] border border-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full mt-2">ID: 99283</span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-start gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-red-600/10 text-red-500 border-r-4 border-red-600 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar Control */}
        <div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all cursor-pointer"
          >
            <LogOut size={18} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* 2. Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 h-20 shadow-[0_-4px_16px_rgba(0,0,0,0.15)] flex justify-between items-center px-2 pb-safe" dir="rtl">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isSelected = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-2.5 transition-all cursor-pointer ${
                isSelected 
                  ? 'text-red-500 scale-102 font-semibold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1.5 rounded-full transition-all ${isSelected ? 'bg-red-500/10' : ''}`}>
                <Icon size={20} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate w-full text-center">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
