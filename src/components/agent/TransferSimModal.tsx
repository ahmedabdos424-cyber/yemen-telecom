/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RefreshCw, Send, X } from 'lucide-react';
import type { OperatorInventory, Operator, Seller } from '../../types';
import { useToast } from '../../hooks/useToast';

interface TransferSimModalProps {
  open: boolean;
  sellers: Seller[];
  inventories: OperatorInventory[];
  initialSellerId?: string;
  onTransferSims: (operator: Operator, count: number, startSerial: string, endSerial: string, recipientName: string) => Promise<unknown>;
  onClose: () => void;
}

export default function TransferSimModal({ open, sellers, inventories, initialSellerId, onTransferSims, onClose }: TransferSimModalProps) {
  const { toastSuccess, toastError, toastWarning } = useToast();

  const [transferOp, setTransferOp] = useState<Operator>('yemen_mobile');
  const [startRange, setStartRange] = useState('');
  const [endRange, setEndRange] = useState('');
  const [targetSellerId, setTargetSellerId] = useState(initialSellerId || '');
  const [isTransferring, setIsTransferring] = useState(false);

  // Auto-calculated quantity for transfer
  const calculatedQty = useMemo(() => {
    const startNum = parseInt(startRange, 10);
    const endNum = parseInt(endRange, 10);
    if (!isNaN(startNum) && !isNaN(endNum) && endNum >= startNum) {
      return endNum - startNum + 1;
    }
    return 0;
  }, [startRange, endRange]);

  // Handle simulated range transfer
  const handleTransferSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!transferOp) { toastWarning('الرجاء اختيار شركة الاتصالات'); return; }
    if (!startRange || !endRange) { toastWarning('الرجاء إدخال نطاق الأرقام التسلسلية'); return; }
    if (calculatedQty <= 0) { toastWarning('الرجاء التأكد من صحة النطاق المدخل'); return; }
    if (!targetSellerId) { toastWarning('الرجاء تحديد البائع المستلم'); return; }

    const recipient = sellers.find(s => s.id === targetSellerId);
    if (!recipient) return;

    // Stock guard: the requested quantity must not exceed the agent's
    // available stock for that operator.
    const inv = inventories.find(i => i.operator === transferOp);
    if (inv && calculatedQty > inv.available) {
      toastWarning(`الكمية المطلوبة (${calculatedQty}) تتجاوز المخزون المتاح لمشغل ${transferOp === 'yemen_mobile' ? 'يمن موبايل' : transferOp === 'you' ? 'YOU' : 'سبأفون'} (${inv.available} شريحة).`);
      return;
    }

    setIsTransferring(true);
    try {
      await onTransferSims(transferOp, calculatedQty, startRange, endRange, recipient.name);
      setStartRange('');
      setEndRange('');
      setTargetSellerId('');
      onClose();
      toastSuccess(`تم تحويل عدد ${calculatedQty} شريحة بنجاح إلى البائع ${recipient.name}.`);
    } catch {
      toastError('فشل تحويل الشرائح. الرجاء المحاولة مرة أخرى.');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-y-auto no-scrollbar max-h-[90vh] text-slate-200"
          >
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-100">تحويل شرائح إلى بائع</h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  أدخل شركة الاتصالات ونطاق السيريال لحساب الكمية وتحويلها فوراً
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 text-slate-500 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-5 text-right">

              {/* Step 1: Carrier selector */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400">الخطوة 1: اختر شركة الاتصالات</label>
                <select
                  value={transferOp}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setTransferOp(e.target.value as Operator)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-red-600 transition-colors"
                >
                  <option value="yemen_mobile">يمن موبايل (Yemen Mobile)</option>
                  <option value="sabafon">سبأفون (Sabafon)</option>
                  <option value="you">YOU (واي)</option>
                </select>
              </div>

              {/* Step 2: Serial ranges input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400">الخطوة 2: حدد نطاق الأرقام التسلسلية</label>
                <p className="text-[9px] text-slate-500">أدخل السيريال الأول والأخير لحساب الكميات تلقائياً.</p>

                <div className="grid grid-cols-2 gap-3" dir="ltr">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 block text-right">إلى رقم</span>
                    <input
                      type="text"
                      value={endRange}
                      onChange={(e) => setEndRange(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-center outline-none focus:border-red-650 transition-colors font-sans"
                      placeholder="89967XXXXXXXXXXXX"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 block text-right">من رقم</span>
                    <input
                      type="text"
                      value={startRange}
                      onChange={(e) => setStartRange(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-center outline-none focus:border-red-650 transition-colors font-sans"
                      placeholder="89967XXXXXXXXXXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Computed Quantity Display */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400">الكمية المحسوبة المبدئية</label>
                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-100 font-extrabold font-sans text-center">
                  {calculatedQty > 0 ? `${calculatedQty} شرائح` : 'الرجاء إدخال نطاق سيريال صالح'}
                </div>
              </div>

              {/* Step 4: Summary container */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-right">
                <h4 className="text-[10px] font-bold text-red-500 mb-2 pb-1 border-b border-slate-800">ملخص العملية</h4>
                <div className="space-y-2 text-[11px] font-light">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>المستلم:</span>
                    <span className="text-slate-100 font-bold">
                      {sellers.find(s => s.id === targetSellerId)?.name || 'الرجاء اختيار البائع'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>شركة الاتصالات:</span>
                    <span className="text-slate-100 font-bold">
                      {transferOp === 'yemen_mobile' ? 'يمن موبايل' : transferOp === 'you' ? 'YOU' : 'سبأفون'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>إجمالي النطاق:</span>
                    <span className="text-slate-100 font-sans font-semibold">
                      {startRange && endRange ? `${startRange} - ${endRange}` : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800/40">
                    <span>إجمالي الكمية:</span>
                    <span className="text-red-400 font-extrabold">{calculatedQty} شريحة</span>
                  </div>
                </div>
              </div>

              {/* Recipient select under Modal */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400">المستلم المعتمد لرحلة الشرائح</label>
                <select
                  value={targetSellerId}
                  onChange={(e) => setTargetSellerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-red-650 transition-colors text-slate-200"
                >
                  <option value="" disabled>اختر البائع المستهدف...</option>
                  {sellers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - {s.storeName}</option>
                  ))}
                </select>
              </div>

              {/* Submit block buttons */}
              <div className="flex flex-col gap-2 pt-4">
                <button
                  type="submit"
                  disabled={isTransferring || calculatedQty <= 0 || !targetSellerId}
                  className="btn btn-primary w-full"
                >
                  {isTransferring ? (
                    <RefreshCw className="animate-spin text-slate-100" size={14} />
                  ) : (
                    <>
                      <Send size={12} />
                      <span>تأكيد تحويل الكمية للبائع</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost w-full"
                >
                  إلغاء العملية
                </button>
              </div>

            </form>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}