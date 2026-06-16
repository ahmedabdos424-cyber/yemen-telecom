import { useState, useRef, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X } from 'lucide-react';
import profileImage from '../../assets/profile.png';

interface ProfileAvatarProps {
  photo: string;
  name: string;
  onPhotoChange: (dataUrl: string) => void;
  onPhotoDelete: () => void;
  size?: number;
  className?: string;
  editable?: boolean;
}

export default function ProfileAvatar({
  photo, name, onPhotoChange, onPhotoDelete,
  size = 28,
  className = '',
  editable = true
}: ProfileAvatarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        onPhotoChange(ev.target.result as string);
        setModalOpen(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className={`relative ${className}`}>
        <div
          className={`rounded-full border-4 border-slate-800 overflow-hidden shadow-xl shadow-black/30`}
          style={{ width: size, height: size }}
        >
          <img loading="lazy" src={photo || profileImage} alt={name} className="w-full h-full object-cover" />
        </div>
        {editable && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="absolute -top-0.5 -right-0.5 w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 border-2 border-slate-900 flex items-center justify-center text-white shadow-lg transition-all cursor-pointer z-10 text-sm font-bold"
          >
            +
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {editable && (
        <AnimatePresence>
          {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir="rtl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl rounded-b-none sm:rounded-3xl p-6 shadow-2xl z-10 text-slate-200"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-slate-100">الصورة الشخصية</h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-100 hover:bg-slate-800/40 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => { fileInputRef.current?.click(); }}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera size={14} />
                  <span>تغيير الصورة</span>
                </button>
                {photo && (
                  <button
                    type="button"
                    onClick={() => { onPhotoDelete(); setModalOpen(false); }}
                    className="w-full py-3.5 bg-red-950/30 hover:bg-red-950/50 text-red-400 font-bold text-xs rounded-xl transition-all border border-red-900/30 cursor-pointer"
                  >
                    إزالة الصورة
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-full py-3 text-slate-500 hover:text-slate-300 text-xs rounded-xl hover:bg-slate-800/40 transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      )}
    </>
  );
}
