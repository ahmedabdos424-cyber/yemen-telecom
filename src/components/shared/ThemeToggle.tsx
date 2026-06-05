import React from 'react';

interface ThemeToggleProps {
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export default function ThemeToggle({ darkMode, setDarkMode }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={() => setDarkMode(!darkMode)}
      className="w-full flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800/40 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="btn-icon rounded-xl bg-amber-600/10 border border-amber-500/20 text-amber-500 group-hover:scale-105 transition-transform">
          <span className="material-symbols-outlined text-lg">
            {darkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-100">
            {darkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {darkMode ? 'التبديل إلى المظهر الفاتح' : 'التبديل إلى المظهر الداكن'}
          </p>
        </div>
      </div>
      <div className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-300 ${darkMode ? 'bg-blue-600' : 'bg-slate-700'}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${darkMode ? 'translate-x-0' : '-translate-x-4'}`} />
      </div>
    </button>
  );
}
