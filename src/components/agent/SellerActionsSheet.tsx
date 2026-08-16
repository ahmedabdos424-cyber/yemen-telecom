/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, X } from 'lucide-react';
import type { Seller } from '../../types';

interface SellerActionsSheetProps {
  open: boolean;
  seller: Seller | null;
  onClose: () => void;
  onResetPassword: (seller: Seller) => void;
  onToggleStatus: (seller: Seller) => void;
}

export default function SellerActionsSheet({ open, seller, onClose, onResetPassword, onToggleStatus }: SellerActionsSheetProps) {
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
            {/* Slider handler indicator */}
            <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-6" />

            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-100">إجراءات البائع والاعتماد</h3>
                <p className="text-[11px] text-slate-400 mt-1">تعديل أو تغيير وضعية ونشاط الحساب لـ "{seller.name}"</p>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 text-slate-500 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* Action Buttons Link stack */}
            <div className="space-y-2 text-right">

              {/* 1. Reset password option */}
              <button
                type="button"
                onClick={() => onResetPassword(seller)}
                className="btn w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-800/40 text-slate-200 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 bg-slate-950 p-2.5 rounded-xl group-hover:text-red-500 transition-colors">lock_reset</span>
                  <div>
                    <p className="font-bold text-xs text-slate-100">إعادة تعيين كلمة المرور</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">تحديث تلقائي وإرسال الكود للبائع عبر SMS</p>
                  </div>
                </div>
                <ArrowLeft size={16} />
              </button>

              {/* 2. Suspend/Activate account option */}
              <button
                type="button"
                onClick={() => onToggleStatus(seller)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all group ${
                  seller.status === 'inactive'
                    ? 'border-emerald-950/20 hover:bg-emerald-950/20 text-emerald-400'
                    : 'border-yellow-950/20 hover:bg-yellow-950/20 text-yellow-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined bg-slate-950 p-2.5 rounded-xl group-hover:scale-105 transition-transform">
                    {seller.status === 'inactive' ? 'check_circle' : 'block'}
                  </span>
                  <div>
                    <p className="font-bold text-xs text-slate-100">
                      {seller.status === 'inactive' ? 'تفعيل الحساب والاعتماد' : 'إيقاف الحساب مؤقتاً'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {seller.status === 'inactive'
                        ? 'السماح مجدداً للبائع بإجراء تفعيل الشرائح في الميدان'
                        : 'منع البائع مؤقتاً من بيع وتفعيل الشرائح وعقد الخدمات'
                      }
                    </p>
                  </div>
                </div>
                <ArrowLeft size={16} />
              </button>

            </div>

            {/* Cancel actions footer */}
            <div className="mt-8 mb-4">
              <button
                type="button"
                onClick={onClose}
                className="btn w-full bg-slate-800 text-slate-100 hover:bg-slate-700"
              >
                إلغاء الإجراءات
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}