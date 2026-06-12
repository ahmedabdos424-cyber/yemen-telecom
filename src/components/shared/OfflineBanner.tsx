import { motion, AnimatePresence } from 'motion/react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const isOnline = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 left-0 right-0 z-[200] bg-red-600/95 backdrop-blur-md text-white px-4 py-3 flex items-center justify-center gap-3 shadow-xl"
          role="alert"
          aria-live="assertive"
        >
          <WifiOff size={18} className="shrink-0" />
          <span className="text-sm font-bold">لا يوجد اتصال بالإنترنت</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
