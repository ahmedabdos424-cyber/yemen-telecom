/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { SIM } from '../../types';

export type SimProvider = 'Yemen Mobile' | 'Sabafon' | 'YOU';
export type SimEditableStatus = 'available' | 'assigned' | 'activated' | 'sold' | 'reserved' | 'inactive';

interface SimEditModalProps {
  sim: SIM;
  onClose: () => void;
  onSubmit: (fields: Partial<SIM>) => void;
}

export default function SimEditModal({ sim, onClose, onSubmit }: SimEditModalProps) {
  const [editPhone, setEditPhone] = useState(sim.phone ?? '');
  const [editProvider, setEditProvider] = useState<SimProvider>(sim.provider as SimProvider);
  const [editPackage, setEditPackage] = useState(sim.packageType ?? '');
  const [editOwner, setEditOwner] = useState(sim.owner ?? '');
  const [editStatus, setEditStatus] = useState<SimEditableStatus>(sim.status as SimEditableStatus);

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      phone: editPhone,
      provider: editProvider,
      packageType: editPackage,
      owner: editOwner,
      status: editStatus,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md lg:max-w-lg overflow-hidden text-right leading-relaxed animate-in fade-in zoom-in-95 duration-200 border border-gray-100/80">
        <div className="px-6 py-4.5 bg-gray-50 border-b border-gray-150 flex justify-between items-center">
          <button onClick={onClose} className="p-2 hover:bg-gray-150/70 rounded-full text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
          <h3 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-primary">edit_note</span>
            تعديل الشريحة
          </h3>
        </div>
        <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-1.5">رقم الهاتف</label>
            <input
              type="text"
              required
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5">الشبكة</label>
              <select
                value={editProvider}
                onChange={(e) => setEditProvider(e.target.value as SimProvider)}
                className="w-full px-3 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none cursor-pointer"
              >
                <option value="Yemen Mobile">يمن موبايل</option>
                <option value="Sabafon">سبأفون</option>
                <option value="YOU">يو</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5">الحالة</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as SimEditableStatus)}
                className="w-full px-3 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none cursor-pointer"
              >
                <option value="available">متاح</option>
                <option value="assigned">مسندة</option>
                <option value="activated">مفعّلة</option>
                <option value="sold">مباع</option>
                <option value="reserved">محجوز</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-1.5">باقة البداية</label>
            <input
              type="text"
              value={editPackage}
              onChange={(e) => setEditPackage(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-1.5">المالك</label>
            <input
              type="text"
              value={editOwner}
              onChange={(e) => setEditOwner(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all"
            />
          </div>
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
              className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:brightness-110 shadow-md active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto"
            >
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}