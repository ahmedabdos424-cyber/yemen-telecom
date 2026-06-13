import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, RefreshCw, X, Camera } from 'lucide-react';

interface CameraPreviewModalProps {
  show: boolean;
  previewImage: string | null;
  isViewfinder?: boolean;
  onCapture: () => void;
  onConfirm: () => void;
  onRetake: () => void;
  onCancel: () => void;
}

export default function CameraPreviewModal({
  show,
  previewImage,
  isViewfinder = false,
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg md:max-w-xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Preview area */}
            <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
              {previewImage ? (
                <>
                  <img src={previewImage} alt="المعاينة" className="w-full h-full object-contain" />
                  <div className="absolute top-3 right-3 bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                    معاينة
                  </div>
                </>
              ) : (
                <>
                  <video autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-[3px] border-dashed border-red-400/40 m-8 rounded-2xl pointer-events-none" />
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-4 bg-slate-950">
              {previewImage ? (
                <>
                  <button
                    type="button"
                    onClick={onConfirm}
                    className="btn btn-sm flex-1 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    موافقة واستخدام الصورة
                  </button>
                  <button
                    type="button"
                    onClick={onRetake}
                    className="btn btn-sm flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={16} />
                    إعادة التقاط
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onCapture}
                    className="btn btn-sm flex-1 bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-2"
                  >
                    <Camera size={16} />
                    التقاط الصورة
                  </button>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="btn btn-sm flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300"
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
