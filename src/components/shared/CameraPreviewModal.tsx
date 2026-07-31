import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, RefreshCw, X, Loader } from 'lucide-react';

interface CameraPreviewModalProps {
  show: boolean;
  previewImage: string | null;
  isViewfinder?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onCapture: () => void;
  onConfirm: () => void;
  onRetake: () => void;
  onCancel: () => void;
  processing?: boolean;
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
  processing = false,
}: CameraPreviewModalProps) {
  const [flash, setFlash] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const lastTouchDist = useRef(0);
  const lastTouchCenter = useRef({ x: 0, y: 0 });
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!show) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    }
  }, [show]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else if (e.touches.length === 1 && scale > 1) {
      draggingRef.current = true;
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastTouchDist.current > 0) {
        const ratio = dist / lastTouchDist.current;
        setScale(prev => Math.min(Math.max(prev * ratio, 1), 5));
      }
      lastTouchDist.current = dist;
    } else if (e.touches.length === 1 && draggingRef.current && scale > 1) {
      const dx = e.touches[0].clientX - lastMouse.current.x;
      const dy = e.touches[0].clientY - lastMouse.current.y;
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setTranslate(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  }, [scale]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = 0;
    draggingRef.current = false;
    setScale(prev => {
      if (prev <= 1.1) {
        setTranslate({ x: 0, y: 0 });
        return 1;
      }
      return prev;
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (previewImage) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(prev => Math.min(Math.max(prev * delta, 1), 5));
    }
  }, [previewImage]);

  const imgStyle: React.CSSProperties = scale > 1
    ? { transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`, cursor: 'grab' }
    : { transform: 'scale(1)' };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col bg-black"
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
                {processing ? 'جارٍ معالجة الصورة...' : previewImage ? 'معاينة الصورة' : 'كاميرا التصوير'}
              </span>
            </div>
            <div className="w-10" />
          </div>

          {/* Preview area — fills available space */}
          <div
            className="relative flex-1 min-h-0 bg-black flex items-center justify-center overflow-hidden"
            ref={imgContainerRef}
            onTouchStart={previewImage ? handleTouchStart : undefined}
            onTouchMove={previewImage ? handleTouchMove : undefined}
            onTouchEnd={previewImage ? handleTouchEnd : undefined}
            onWheel={previewImage ? handleWheel : undefined}
          >
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

            {/* Processing overlay */}
            <AnimatePresence>
              {processing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3"
                >
                  <Loader size={32} className="text-white animate-spin" />
                  <span className="text-white/80 text-sm font-medium">جارٍ معالجة الصورة...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {previewImage ? (
              <>
                <img
                  src={previewImage}
                  alt="المعاينة"
                  className="w-full h-full object-contain transition-transform duration-100"
                  style={imgStyle}
                  draggable={false}
                />
                <div className="absolute top-4 right-4 bg-emerald-500/90 text-white text-[11px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-lg">
                  <Check size={14} strokeWidth={3} />
                  معاينة الصورة
                </div>
                {scale > 1 && (
                  <button
                    type="button"
                    onClick={() => { setScale(1); setTranslate({ x: 0, y: 0 }); }}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-sm text-white text-[10px] px-3 py-1.5 rounded-full font-medium"
                  >
                    إعادة تعيين التكبير
                  </button>
                )}
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
                  disabled={processing}
                  className="flex-1 h-14 flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 active:bg-white/30 text-white text-sm font-bold rounded-2xl transition-all active:scale-[0.97] disabled:opacity-50"
                >
                  <RefreshCw size={18} />
                  إعادة التقاط
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={processing}
                  className="flex-[2] h-14 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-bold rounded-2xl transition-all active:scale-[0.97] shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                >
                  {processing ? (
                    <Loader size={20} className="animate-spin" />
                  ) : (
                    <Check size={20} strokeWidth={3} />
                  )}
                  {processing ? 'جارٍ المعالجة...' : 'موافقة واستخدام الصورة'}
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
