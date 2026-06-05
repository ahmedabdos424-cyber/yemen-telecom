import React from 'react';
import { motion } from 'motion/react';

export default function LoadingScreen({ message = 'جاري التحميل...' }) {
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-16 h-16 bg-red-600 rounded-[20px] flex items-center justify-center shadow-lg shadow-red-900/30">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="material-symbols-outlined text-3xl text-white"
          >
            sim_card
          </motion.span>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="w-2 h-2 rounded-full bg-red-500"
          />
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.2, ease: "easeInOut" }}
            className="w-2 h-2 rounded-full bg-red-500"
          />
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.4, ease: "easeInOut" }}
            className="w-2 h-2 rounded-full bg-red-500"
          />
        </div>
        <p className="text-xs text-slate-500">{message}</p>
      </motion.div>
    </div>
  );
}
