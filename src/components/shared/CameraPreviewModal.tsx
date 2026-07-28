import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, RefreshCw, X, Camera, Zap, ZapOff } from 'lucide-react';

interface CameraPreviewModalProps {
  show: boolean;
  previewImage: string | null;
  isViewfinder?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onCapture: () => void;
  onConfirm: () => void;
  onRetake: () => void;
  onCancel: () => void;
}

export default function CameraPreviewModal({
  show,
  previewImage,
  isViewfinder = false,
  videoRef,
  onCapture,
  onConfirm,
  onRetake,
  onCancel,
}: CameraPreviewModalProps) {
  const [flash, setFlash] = useState(false);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex flex-col bg-black"
        >
          {/* Header bar */}
          <div className="relative z-10 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] pb-2 bg-gradient-to-b from-black/80 to-transparent">
            <button
              type="button"
              onClick={onCancel}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white active:scale-95 transition-transform"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-white/80 text-xs font-medium">
                {previewImage ? 'معاينة الصورة' : 'كاميرا التصوير'}
              </span>
            </div>
            <div className="w-10" />
          </div>

          {/* Preview area — fills available space */}
          <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center">
            {/* Flash animation overlay */}
            <AnimatePresence>
              {flash && (
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 z-20 bg-white pointer-events-none"
                />
              )}
            </AnimatePresence>

            {previewImage ? (
              <>
                <img src={previewImage} alt="المعاينة" className="w-full h-full object-contain" />
                <div className="absolute top-4 right-4 bg-emerald-500/90 text-white text-[11px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-lg">
                  <Check size={14} strokeWidth={3} />
                  معاينة الصورة
                </div>
              </>
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {/* Viewfinder guide frame */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[85%] h-[65%] border-2 border-white/20 rounded-2xl" />
                </div>
                {/* Corner guides */}
                <div className="absolute top-[17%] left-[7.5%] w-8 h-8 border-t-2 border-l-2 border-red-400 rounded-tl-lg pointer-events-none" />
                <div className="absolute top-[17%] right-[7.5%] w-8 h-8 border-t-2 border-r-2 border-red-400 rounded-tr-lg pointer-events-none" />
                <div className="absolute bottom-[17%] left-[7.5%] w-8 h-8 border-b-2 border-l-2 border-red-400 rounded-bl-lg pointer-events-none" />
                <div className="absolute bottom-[17%] right-[7.5%] w-8 h-8 border-b-2 border-r-2 border-red-400 rounded-br-lg pointer-events-none" />
              </>
            )}
          </div>

          {/* Bottom actions — safe area aware */}
          <div className="relative z-10 bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-6 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {previewImage ? (
              /* Preview mode: confirm / retake */
              <div className="flex gap-3 px-6">
                <button
                  type="button"
                  onClick={onRetake}
                  className="flex-1 h-14 flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 active:bg-white/30 text-white text-sm font-bold rounded-2xl transition-all active:scale-[0.97]"
                >
                  <RefreshCw size={18} />
                  إعادة التقاط
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="flex-[2] h-14 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-bold rounded-2xl transition-all active:scale-[0.97] shadow-lg shadow-emerald-600/30"
                >
                  <Check size={20} strokeWidth={3} />
                  موافقة واستخدام الصورة
                </button>
              </div>
            ) : (
              /* Viewfinder mode: capture button */
              <div className="flex items-center justify-center gap-8">
                {/* Cancel */}
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white active:scale-95 transition-transform"
                >
                  <X size={22} />
                </button>

                {/* Large capture button */}
                <button
                  type="button"
                  onClick={() => { setFlash(true); setTimeout(() => setFlash(false), 300); onCapture(); }}
                  className="relative w-[72px] h-[72px] rounded-full bg-white active:scale-90 transition-all duration-100 shadow-lg"
                  aria-label="التقاط الصورة"
                >
                  <span className="absolute inset-[4px] rounded-full border-[3px] border-black/10" />
                </button>

                {/* Spacer to balance layout */}
                <div className="w-12 h-12" />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
