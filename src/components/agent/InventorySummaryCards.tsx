/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { OperatorInventory, Operator, Seller } from '../../types';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import OperatorLogo from '../shared/OperatorLogo';

interface InventorySummaryCardsProps {
  inventories: OperatorInventory[];
  sellers: Seller[];
  onUpdateInventories: (inventories: OperatorInventory[]) => void;
  onAddSeller: () => void;
}

export default function InventorySummaryCards({ inventories, sellers, onUpdateInventories, onAddSeller }: InventorySummaryCardsProps) {
  const { toastSuccess, toastError, toastInfo } = useToast();
  const [refreshingOperator, setRefreshingOperator] = useState<string | null>(null);

  const handleRefreshInventory = async (operator: Operator) => {
    setRefreshingOperator(operator);
    try {
      const operatorName =
        operator === 'yemen_mobile' || operator === 'Yemen Mobile'
          ? 'يمن موبايل'
          : operator === 'you' || operator === 'YOU'
          ? 'YOU'
          : 'سبأفون';

      const fresh = (await api.getInventories()) as OperatorInventory[] | null;
      if (fresh && fresh.length) {
        onUpdateInventories(fresh);
        toastSuccess(`تم تحديث بيانات المخزون لـ ${operatorName}.`);
      } else {
        toastInfo(`لا توجد بيانات مخزون متاحة لـ ${operatorName}.`);
      }
    } catch {
      toastError('فشلت عملية تحديث المخزون. يرجى المحاولة لاحقاً.');
    } finally {
      setRefreshingOperator(null);
    }
  };

  return (
    <div className="snap-dashboard">
      {inventories.map((inv) => {
        const isYm = inv.operator === 'yemen_mobile' || inv.operator === 'Yemen Mobile';
        const isYou = inv.operator === 'you' || inv.operator === 'YOU';
        const colorBorder = isYm ? 'border-red-500' : isYou ? 'border-amber-400' : 'border-blue-500';
        const colorText = isYm ? 'text-red-400' : isYou ? 'text-amber-400' : 'text-blue-400';
        const badgeText = isYm ? 'يمن موبايل' : isYou ? 'YOU' : 'سبأفون';

        return (
          <div key={inv.operator} className={`stat-card border-r-4 ${colorBorder} shadow hover:shadow-lg transition-all flex flex-col justify-between`}>
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <OperatorLogo provider={inv.operator} size="md" />
                  <span className="font-bold text-slate-100 text-sm">{badgeText}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] text-slate-500 font-medium">إجمالي الشرائح المتوفرة</h4>
                  <span className="text-2xl font-bold tracking-tight text-slate-100">{inv.available}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-800/40 pt-3 text-right">
                  <div>
                    <h4 className="text-[9px] text-slate-500 font-medium">اجمالي المتبقي</h4>
                    <p className={`font-bold text-xs ${colorText}`}>{inv.remaining}</p>
                  </div>
                  <div>
                    <h4 className="text-[9px] text-slate-500 font-medium">الفترة الزمنية</h4>
                    <p className="font-semibold text-slate-300 text-xs">{inv.periodDays} يوم</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              id={`btn-refresh-${inv.operator}`}
              onClick={() => handleRefreshInventory(inv.operator)}
              disabled={refreshingOperator === inv.operator}
              className="btn btn-sm w-full mt-5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700 disabled:opacity-50"
            >
              <RefreshCw size={12} className={refreshingOperator === inv.operator ? "animate-spin text-red-500" : "text-slate-400"} />
              <span>{refreshingOperator === inv.operator ? 'جاري المزامنة...' : 'تحديث المخزون'}</span>
            </button>
          </div>
        );
      })}

      {/* Dynamic Total Sellers statistics card */}
      <div className="stat-card border-r-4 border-r-emerald-500 shadow hover:shadow-lg transition-all flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-black/20">
                <span className="material-symbols-outlined text-emerald-400 text-[18px]">groups</span>
              </div>
              <span className="font-bold text-slate-100 text-sm">البائعين ونقاط البيع</span>
            </div>
          </div>
          <div className="space-y-4 text-right">
            <div>
              <h4 className="text-[10px] text-slate-500 font-medium font-sans">إجمالي البائعين التابعين للوكيل</h4>
              <span className="text-2xl font-bold tracking-tight text-slate-100">{sellers.length}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 border-t border-slate-800/40 pt-3 text-right">
              <div>
                <h4 className="text-[9px] text-slate-500 font-medium">النشطين</h4>
                <p className="font-bold text-[11px] text-emerald-400">{sellers.filter((s) => s.status === 'active').length}</p>
              </div>
              <div>
                <h4 className="text-[9px] text-slate-500 font-medium font-sans">مخزون منخفض</h4>
                <p className="font-bold text-[11px] text-amber-500">{sellers.filter((s) => s.status === 'low_stock').length}</p>
              </div>
              <div>
                <h4 className="text-[9px] text-slate-500 font-medium">غير نشط</h4>
                <p className="font-semibold text-slate-400 text-[11px]">{sellers.filter((s) => s.status === 'inactive').length}</p>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onAddSeller}
          className="btn btn-sm w-full mt-5 bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-700"
        >
          <span className="material-symbols-outlined text-[14px]">person_add</span>
          <span>تسجيل بائع إضافي</span>
        </button>
      </div>
    </div>
  );
}