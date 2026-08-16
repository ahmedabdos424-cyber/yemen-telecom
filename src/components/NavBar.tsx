import { Role } from '../types';
import { Home, PlusCircle, UserPlus, Users, Cpu, UserCircle, LogOut } from 'lucide-react';
import MobileBottomNav from './shared/MobileBottomNav';
import ProfileAvatar from './shared/ProfileAvatar';

interface NavBarProps {
  role: Role;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  username: string;
  onLogout: () => void;
}

export default function NavBar({ role, activeTab, setActiveTab, username, onLogout }: NavBarProps) {
  const isAgent = role === 'agent';

  const menuItems = isAgent
    ? [
        { id: 'home', label: 'الرئيسية', icon: Home },
        { id: 'activate', label: 'تفعيل شريحة', icon: PlusCircle },
        { id: 'add_seller', label: 'إضافة بائع', icon: UserPlus },
        { id: 'sellers', label: 'البائعين', icon: Users },
        { id: 'my_sims', label: 'شرائحي', icon: Cpu },
        { id: 'account', label: 'بيانات الحساب', icon: UserCircle },
      ]
    : [
        { id: 'home', label: 'الرئيسية', icon: Home },
        { id: 'activate', label: 'تفعيل شريحة', icon: PlusCircle },
        { id: 'my_sims', label: 'شرائحي', icon: Cpu },
        { id: 'account', label: 'بيانات الحساب', icon: UserCircle },
      ];

  const bottomNavItems = isAgent
    ? [
        { id: 'home', label: 'الرئيسية', icon: 'home' },
        { id: 'activate', label: 'تفعيل شريحة', icon: 'add_circle' },
        { id: 'add_seller', label: 'إضافة بائع', icon: 'person_add' },
        { id: 'sellers', label: 'البائعين', icon: 'group' },
        { id: 'my_sims', label: 'شرائحي', icon: 'sim_card' },
        { id: 'account', label: 'بيانات الحساب', icon: 'account_circle' },
      ]
    : [
        { id: 'home', label: 'الرئيسية', icon: 'home' },
        { id: 'activate', label: 'تفعيل شريحة', icon: 'add_circle' },
        { id: 'my_sims', label: 'شرائحي', icon: 'sim_card' },
        { id: 'account', label: 'بيانات الحساب', icon: 'account_circle' },
      ];

  return (
    <>
      <aside className="hidden lg:flex flex-col fixed right-0 top-0 h-screen bg-slate-900 border-l border-slate-800 w-70 text-slate-100 z-40 p-5 pt-20 justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-3 py-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 shadow-md shadow-black/20">
            <div className="w-11 h-11 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <span className="material-symbols-outlined text-[24px]">leak_add</span>
            </div>
            <div className="text-right">
              <h3 className="font-bold text-sm tracking-tight text-white">نظام التوزيع الموحد</h3>
              <p className="text-[10px] text-slate-400 font-light translate-y-0.5">منصة الشرائح الذكية</p>
            </div>
          </div>

          <div className="flex flex-col items-center px-4 py-5 bg-slate-950/30 rounded-2xl border border-slate-800/20 text-center shadow-md shadow-black/20">
            <div className="mb-3">
              <ProfileAvatar
                photo=""
                name={username}
                onPhotoChange={() => {}}
                onPhotoDelete={() => {}}
                size={56}
                editable={false}
              />
            </div>
            <p className="font-bold text-sm text-slate-100">{username}</p>
          </div>

          <nav className="space-y-1 bg-slate-950/20 rounded-2xl p-2 border border-slate-800/20">
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

      <MobileBottomNav
        items={bottomNavItems}
        activeId={activeTab}
        onChange={setActiveTab}
      />
    </>
  );
}
