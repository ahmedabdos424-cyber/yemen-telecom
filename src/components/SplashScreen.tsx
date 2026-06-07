import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 200);
    const t2 = setTimeout(() => setPhase('exit'), 2200);
    const t3 = setTimeout(() => onFinish(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <AnimatePresence>
      {phase !== 'exit' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] bg-[#0a0e1a] flex flex-col items-center justify-center"
        >
          {/* Ambient orbs */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/8 rounded-full blur-[90px] pointer-events-none" />

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: phase === 'show' ? 1 : 0.9,
              opacity: 1,
              rotate: phase === 'show' ? [0, 360, 360] : 0,
            }}
            transition={{
              scale: { type: 'spring', stiffness: 180, damping: 15, delay: 0.1 },
              opacity: { duration: 0.3, delay: 0.1 },
              rotate: { duration: 2, ease: 'easeInOut', delay: 0.1 },
            }}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] sm:rounded-[32px] overflow-hidden shadow-2xl shadow-red-900/40"
          >
            <img src="/icon-192.png" alt="يمن تليكوم" className="w-full h-full object-cover" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="text-lg sm:text-xl font-bold text-white/90 mt-4 tracking-wide"
          >
            يمن تليكوم
          </motion.h1>

          {/* Loading dots */}
          <div className="flex items-center gap-2 mt-6">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: 'easeInOut' }}
                className="w-2 h-2 rounded-full bg-red-500"
              />
            ))}
          </div>

          {/* Version */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.3 }}
            className="absolute bottom-10 text-[10px] text-white/15 font-light tracking-wide"
          >
            v4.2.0
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
