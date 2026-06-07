import { motion } from 'motion/react';

export default function LoadingScreen({ message = 'جاري التحميل...' }) {
  return (
    <div className="min-h-dvh bg-[#0a0e1a] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-5"
      >
        <div className="w-20 h-20 rounded-[24px] overflow-hidden shadow-2xl shadow-red-900/30">
          <img src="/icon-192.png" alt="يمن تليكوم" className="w-full h-full object-cover" />
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-lg font-bold text-white/90"
        >
          يمن تليكوم
        </motion.h1>
        <div className="flex items-center gap-2 mt-1">
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="w-2 h-2 rounded-full bg-red-500"
          />
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.2, ease: "easeInOut" }}
            className="w-2 h-2 rounded-full bg-red-500"
          />
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.4, ease: "easeInOut" }}
            className="w-2 h-2 rounded-full bg-red-500"
          />
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-xs text-white/35"
        >
          {message}
        </motion.p>
      </motion.div>
    </div>
  );
}
