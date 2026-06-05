import React from 'react';
import { motion } from 'motion/react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
  width?: string;
  height?: string;
}

export function Skeleton({ className = '', variant = 'rect', width, height }: SkeletonProps) {
  const base = 'bg-slate-800 animate-pulse rounded-lg';
  const shape = variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded-md h-3' : 'rounded-lg';
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${base} ${shape} ${className}`}
      style={{ width, height }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width="40px" height="40px" />
        <div className="space-y-2 flex-1">
          <Skeleton width="60%" />
          <Skeleton width="40%" />
        </div>
      </div>
      <Skeleton width="80%" />
      <div className="flex justify-between">
        <Skeleton width="30%" />
        <Skeleton width="25%" />
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton variant="circle" width="36px" height="36px" />
        <Skeleton width="50px" height="20px" />
      </div>
      <Skeleton width="70%" height="28px" />
      <Skeleton width="40%" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 p-3 bg-slate-900/40 rounded-xl">
        {[1,2,3,4].map(i => <div key={i} className="flex-1"><Skeleton /></div>)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3">
          {[1,2,3,4].map(j => <div key={j} className="flex-1"><Skeleton height="12px" /></div>)}
        </div>
      ))}
    </div>
  );
}
