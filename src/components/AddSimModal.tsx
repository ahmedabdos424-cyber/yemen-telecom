/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useCallback } from 'react';
import { Agent, Seller } from '../types';
import type { CreateSimBatchRequest, SimBatchResult } from '../api/types';

interface AddSimModalProps {
  agents: Agent[];
  sellers: Seller[];
  onClose: () => void;
  onSubmit: (payload: CreateSimBatchRequest) => Promise<SimBatchResult | void>;
}

const MAX_BATCH_SIMS = 5000;

interface RangeInfo {
  count: bigint | null;
  error: string | null;
}

function computeRange(fromIccid: string, toIccid: string): RangeInfo {
  if (!/^\d+$/.test(fromIccid) || !/^\d+$/.test(toIccid)) {
    return { count: null, error: 'يجب إدخال أرقام فقط في حقلي النطاق' };
  }
  if (fromIccid.length !== toIccid.length) {
    return { count: null, error: 'يجب أن يكون الرقمان بنفس الطول' };
  }
  const from = BigInt(fromIccid);
  const to = BigInt(toIccid);
  if (to < from) {
    return { count: null, error: 'قيمة "إلى" أصغر من قيمة "من"' };
  }
  const count = to - from + 1n;
  if (count > BigInt(MAX_BATCH_SIMS)) {
    return { count: null, error: `الحد الأقصى ${MAX_BATCH_SIMS} شريحة لكل دفعة` };
  }
  return { count, error: null };
}

function AddSimModal({ agents, sellers, onClose, onSubmit }: AddSimModalProps) {
  const [fromIccid, setFromIccid] = useState('');
  const [toIccid, setToIccid] = useState('');
  const [provider, setProvider] = useState<'Yemen Mobile' | 'Sabafon' | 'YOU'>('Yemen Mobile');
  const [packageType, setPackageType] = useState('باقة مزايا الشهرية');
  const [ownerRole, setOwnerRole] = useState<'admin' | 'agent' | 'seller'>('admin');
  const [ownerId, setOwnerId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const range = useMemo(() => computeRange(fromIccid, toIccid), [fromIccid, toIccid]);
  const canSubmit =
    !submitting &&
    range.count !== null &&
    range.error === null &&
    (ownerRole === 'admin' || ownerId !== '');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !range.count) return;
    setSubmitting(true);
    try {
      await onSubmit({
        from_iccid: fromIccid,
        to_iccid: toIccid,
        provider,
        package_type: packageType,
        owner_role: ownerRole,
        owner_id: ownerRole === 'admin' ? undefined : Number(ownerId),
      });
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, range.count, fromIccid, toIccid, provider, packageType, ownerRole, ownerId, onSubmit]);

  return (
    <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md lg:max-w-lg overflow-hidden text-right leading-relaxed animate-in fade-in zoom-in-95 duration-200 border border-gray-100/80">
        <div className="px-6 py-4.5 bg-gray-50 border-b border-gray-150 flex justify-between items-center">
          <button onClick={onClose} className="p-2 hover:bg-gray-150/70 rounded-full text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
          <h3 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-primary">inventory_2</span>
            إضافة دفعة شرائح (نطاق ICCID)
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5">بداية النطاق (من)</label>
              <input
                type="text"
                required
                value={fromIccid}
                onChange={(e) => setFromIccid(e.target.value)}
                placeholder="8996701123456789"
                dir="ltr"
                className="w-full px-3 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all font-mono text-left"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5">نهاية النطاق (إلى)</label>
              <input
                type="text"
                required
                value={toIccid}
                onChange={(e) => setToIccid(e.target.value)}
                placeholder="8996701123456899"
                dir="ltr"
                className="w-full px-3 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all font-mono text-left"
              />
            </div>
          </div>

          <div className={`rounded-xl px-3 py-2 text-[11px] font-bold border ${
            range.error
              ? 'bg-red-50 text-red-700 border-red-200'
              : range.count !== null
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            {range.error
              ? range.error
              : range.count !== null
              ? `عدد الشرائح في الدفعة: ${range.count.toString()}`
              : 'أدخل بداية ونهاية النطاق لاحتساب العدد'}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5">الشبكة المزودة</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as 'Yemen Mobile' | 'Sabafon' | 'YOU')}
                className="w-full px-3 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none cursor-pointer"
              >
                <option value="Yemen Mobile">يمن موبايل</option>
                <option value="Sabafon">سبأفون</option>
                <option value="YOU">يو</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5">باقة البداية المخصصة</label>
              <input
                type="text"
                value={packageType}
                onChange={(e) => setPackageType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5">مخزن التوزيع</label>
              <select
                value={ownerRole}
                onChange={(e) => { setOwnerRole(e.target.value as 'admin' | 'agent' | 'seller'); setOwnerId(''); }}
                className="w-full px-3 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none cursor-pointer"
              >
                <option value="admin">المركز الرئيسي (متاح للجميع)</option>
                <option value="agent">وكيل</option>
                <option value="seller">بائع</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5">الوكيل / البائع المستلم</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                disabled={ownerRole === 'admin'}
                className="w-full px-3 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">— اختر المستلم —</option>
                {ownerRole === 'agent' && agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
                {ownerRole === 'seller' && sellers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 leading-relaxed">
            عند الإسناد لوكيل أو بائع تصبح الشرائح «متاحة» ضمن مخزونه ولا يمكن تفعيلها إلا منها.
            الشرائح المكررة في القاعدة سيتم تخطيها تلقائياً.
          </p>

          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 text-gray-700 bg-white hover:bg-gray-55/70 rounded-xl text-xs font-bold transition-all hover:border-gray-300 cursor-pointer w-full sm:w-auto"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:brightness-110 shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 w-full sm:w-auto"
            >
              {submitting ? 'جارٍ الإضافة...' : 'إضافة الدفعة للمخزون'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddSimModal;
