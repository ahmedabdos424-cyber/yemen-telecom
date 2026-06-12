import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function PullToRefresh({ onRefresh, children, containerRef }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const pullY = useMotionValue(0);
  const [canPull, setCanPull] = useState(false);
  const stateRef = useRef({ refreshing: false });

  const pullProgress = useTransform(pullY, [0, 80], [0, 1]);
  const indicatorY = useTransform(pullY, v => Math.min(v, 80));

  const handleRefresh = useCallback(async () => {
    if (stateRef.current.refreshing) return;
    stateRef.current.refreshing = true;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      stateRef.current.refreshing = false;
      setRefreshing(false);
      animate(pullY, 0, { duration: 0.2, type: 'spring', damping: 20, stiffness: 200 });
    }
  }, [onRefresh, pullY]);

  useEffect(() => {
    const el = containerRef?.current || document.querySelector('.pull-to-refresh-scroll');
    if (!el) return;

    let startY = 0;
    let pulling = false;

    const onTouchStart = (e: TouchEvent) => {
      if (stateRef.current.refreshing) return;
      startY = e.touches[0].clientY;
      pulling = (el as HTMLElement).scrollTop <= 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling || stateRef.current.refreshing) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0) {
        pullY.set(Math.min(dy * 0.5, 120));
        if (dy > 80) setCanPull(true);
      }
    };

    const onTouchEnd = () => {
      if (!pulling || stateRef.current.refreshing) return;
      if (canPull && pullY.get() > 50) {
        handleRefresh();
      } else {
        animate(pullY, 0, { duration: 0.15 });
      }
      pulling = false;
      setCanPull(false);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [containerRef, handleRefresh, canPull, pullY]);

  return (
    <div className="relative">
      <motion.div
        style={{ y: indicatorY, opacity: useTransform(pullProgress, [0, 1], [0, 1]) }}
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
      >
        <motion.div
          animate={{ rotate: refreshing ? 360 : canPull ? 180 : 0 }}
          transition={{ duration: refreshing ? 0.8 : 0.2, repeat: refreshing ? Infinity : 0, ease: 'linear' }}
          className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center"
        >
          <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
        </motion.div>
      </motion.div>
      <div className={refreshing ? 'opacity-60 transition-opacity duration-200' : ''}>
        {children}
      </div>
    </div>
  );
}
