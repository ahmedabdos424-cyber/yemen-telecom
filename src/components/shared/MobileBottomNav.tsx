import { motion } from 'motion/react';
import { useCamera } from '../../context/CameraContext';

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

interface MobileBottomNavProps {
  items: NavItem[];
  activeId: string;
  onChange: (id: string) => void;
  badgeCount?: number;
  badgeOnId?: string;
}

export default function MobileBottomNav({ items = [], activeId, onChange, badgeCount, badgeOnId }: MobileBottomNavProps) {
  const { isCameraOpen } = useCamera();
  if (isCameraOpen) return null;
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-[0_-4px_16px_rgba(0,0,0,0.15)] nav-safe-bottom transition-all duration-200">
      <div className="max-w-7xl mx-auto h-14 px-1 flex justify-around items-center" dir="rtl">
        {items.map((item) => {
          const isSelected = activeId === item.id;
          return (
            <button key={item.id} onClick={() => onChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 transition-all cursor-pointer min-w-0 touch-target relative ${
                isSelected ? 'text-red-500 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label={item.label}
              role="tab"
              aria-selected={isSelected}
              aria-current={isSelected ? 'page' : undefined}>
              {isSelected && (
                <motion.span layoutId="bottomNavIndicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-ym rounded-b-md" />
              )}
              <div className={`p-1.5 rounded-full transition-all ${isSelected ? 'bg-red-500/10' : ''}`}>
                <span className={`material-symbols-outlined text-2xl transition-transform duration-200 ${isSelected ? 'scale-110 font-bold' : ''}`}>{item.icon}</span>
              </div>
              <span className="text-[9px] mt-0.5 truncate w-full text-center leading-tight">{item.label}</span>
              {isSelected && <span className="w-1 h-1 rounded-full bg-red-500 mt-0.5" />}
              {Boolean(badgeCount && Number(badgeCount) > 0) && item.id === badgeOnId && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute top-0.5 right-1/2 translate-x-3 translate-y-0.5 bg-red-600 text-white font-mono text-[8px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {badgeCount > 9 ? '9+' : badgeCount}
                </motion.span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
