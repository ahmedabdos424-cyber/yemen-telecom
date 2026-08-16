/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import type { Seller } from '../../types';
import profileImage from '../../assets/profile.png';

interface SellerDetailsSheetProps {
  open: boolean;
  seller: Seller | null;
  onClose: () => void;
  onTransferTo: (seller: Seller) => void;
}

export default function SellerDetailsSheet({ open, seller, onClose, onTransferTo }: SellerDetailsSheetProps) {
  return (
    <AnimatePresence>
      {open && seller && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-lg bg-slate-900 border-t border-slate-800 rounded-t-[32px] p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto no-scrollbar"
          >
            {/* Close handle indicator */}
            <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-6" />

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-slate-100">تفاصيل البائع والاعتماد</h3>
              <button
                onClick={onClose}
                className="p-2.5 text-slate-500 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile card avatar content */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full border-4 border-slate-850 shadow-md overflow-hidden bg-slate-950 mb-3 flex items-center justify-center">
                <img loading="lazy" src={seller.avatar || profileImage} alt={seller.name} className="w-full h-full object-cover" />
              </div>
              <h4 className="font-bold text-lg text-slate-100">{seller.name}</h4>
              <p className="text-xs text-slate-400 mt-1">{seller.storeName}</p>
            </div>

            {/* Specs detailed card stack */}
            <div className="space-y-3 bg-slate-950/40 p-5 rounded-2xl border border-slate-800 mb-6 text-right">
              <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                <span className="text-slate-500 text-xs font-semibold">رقم هوية البائع:</span>
                <span className="text-slate-200 text-xs font-mono font-bold">{seller.idNumber}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                <span className="text-slate-500 text-xs font-semibold">الهاتف المقترن:</span>
                <span className="text-slate-200 text-xs font-mono font-bold" dir="ltr">{seller.phone}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                <span className="text-slate-500 text-xs font-semibold">التغطية والمنطقة الجغرافية:</span>
                <span className="text-slate-200 text-xs font-bold">{seller.region}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                <span className="text-slate-500 text-xs font-semibold">تاريخ التسجيل والاعتماد:</span>
                <span className="text-slate-200 text-xs font-bold">{seller.creationDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs font-semibold">آخر نشاط مسجل:</span>
                <span className="text-slate-200 text-xs font-bold">{seller.lastLogin}</span>
              </div>
            </div>

            {/* Dialog buttons control */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTransferTo(seller);
                }}
                className="btn btn-primary w-full"
              >
                تعديل بيانات البائع أو تحويل شرائح
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost w-full"
              >
                إغلاق نافذة التفاصيل
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}