/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SIM } from '../../types';
import { statusBadgeClass, statusLabel } from './simStatus';

interface SimDetailModalProps {
  sim: SIM;
  onClose: () => void;
  onEdit: (sim: SIM) => void;
}

export default function SimDetailModal({ sim, onClose, onEdit }: SimDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-right leading-relaxed animate-in fade-in zoom-in-95 duration-200 border border-gray-100/80">
        <div className="px-6 py-4.5 bg-gray-50 border-b border-gray-150 flex justify-between items-center">
          <button onClick={onClose} className="p-2 hover:bg-gray-150/70 rounded-full text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
          <h3 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-primary">sim_card</span>
            تفاصيل الشريحة
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-gray-400 font-bold mb-1">رقم الهاتف</p>
              <p className="text-sm font-bold font-mono text-gray-900">{sim.phone}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold mb-1">ICCID</p>
              <p className="text-sm font-bold font-mono text-gray-900">{sim.iccid}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold mb-1">الشبكة</p>
              <p className="text-sm font-bold text-gray-900">{sim.provider}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold mb-1">الحالة</p>
              <span className={`badge ${statusBadgeClass(sim.status)}`}>
                {statusLabel(sim.status)}
              </span>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-gray-400 font-bold mb-1">باقة البداية</p>
              <p className="text-sm font-bold text-gray-900">{sim.packageType}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-gray-400 font-bold mb-1">المالك</p>
              <p className="text-sm font-bold text-gray-900">{sim.owner}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-gray-400 font-bold mb-1">تاريخ الإضافة</p>
              <p className="text-sm font-bold text-gray-900">{sim.dateAdded}</p>
            </div>
          </div>
          <div className="flex justify-end pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => onEdit(sim)}
              className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:brightness-110 shadow-md active:scale-[0.98] transition-all cursor-pointer"
            >
              تعديل الشريحة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}