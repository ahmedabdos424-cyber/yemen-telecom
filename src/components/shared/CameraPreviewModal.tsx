import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, RefreshCw, X, Camera } from 'lucide-react';

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
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex sm:items-center justify-center bg-black sm:bg-black/80 sm:backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="relative w-full h-full sm:h-auto sm:max-w-lg md:max-w-xl bg-slate-900 sm:border sm:border-slate-800 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Preview area — fills available space */}
            <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center">
              {previewImage ? (
                <>
                  <img src={previewImage} alt="المعاينة" className="w-full h-full object-contain" />
                  <div className="absolute top-3 right-3 bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                    معاينة
                  </div>
                </>
              ) : (
                <>
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-[3px] border-dashed border-red-400/40 m-6 sm:m-8 rounded-2xl pointer-events-none" />
                </>
              )}
            </div>

            {/* Actions — safe area aware, larger touch targets on mobile */}
            <div className="flex gap-3 p-4 sm:p-4 bg-slate-950 sm:bg-slate-950 safe-bottom">
              {previewImage ? (
                <>
                  <button
                    type="button"
                    onClick={onConfirm}
                    className="btn flex-1 min-h-[48px] sm:min-h-[40px] bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-medium flex items-center justify-center gap-2 rounded-xl transition-colors"
                  >
                    <Check size={18} />
                    موافقة واستخدام الصورة
                  </button>
                  <button
                    type="button"
                    onClick={onRetake}
                    className="btn flex-1 min-h-[48px] sm:min-h-[40px] bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 text-sm font-medium flex items-center justify-center gap-2 rounded-xl transition-colors"
                  >
                    <RefreshCw size={18} />
                    إعادة التقاط
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onCapture}
                    className="btn flex-1 min-h-[48px] sm:min-h-[40px] bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-sm font-medium flex items-center justify-center gap-2 rounded-xl transition-colors"
                  >
                    <Camera size={18} />
                    التقاط الصورة
                  </button>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="btn flex-1 min-h-[48px] sm:min-h-[40px] bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 text-sm font-medium rounded-xl transition-colors"
                  >
                    إلغاء
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
