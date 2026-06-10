import { motion } from 'motion/react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      role="status"
    >
      <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-5">
        {icon || <PackageOpen size={36} className="text-slate-600" />}
      </div>
      <h3 className="text-lg font-bold text-slate-300 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer min-h-[44px]"
          tabIndex={0}
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
