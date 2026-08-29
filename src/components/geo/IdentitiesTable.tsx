/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Download } from 'lucide-react';
import type { DuplicateIdentityRow } from '../../api/types';
import { useToast } from '../../hooks/useToast';
import { downloadCsv, formatLastActivity, identityCsvRows } from './riskTypes';

interface IdentitiesTableProps {
  identities: DuplicateIdentityRow[];
  searchWord: string;
  onSearchChange: (value: string) => void;
  actionLoading: { [key: string]: boolean };
  onFlag: (idNo: string, name: string) => void;
  onBlock: (idNo: string, name: string) => void;
  onInspect: (item: DuplicateIdentityRow) => void;
}

export default function IdentitiesTable({ identities, searchWord, onSearchChange, actionLoading, onFlag, onBlock, onInspect }: IdentitiesTableProps) {
  const { toastSuccess, toastInfo } = useToast();

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchWord}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="البحث برقم الهوية، الاسم أو المنطقة..."
            className="input-field bg-gray-50 pr-10 text-xs"
          />
          <span className="material-symbols-outlined absolute right-3 top-2 text-gray-450 text-sm">search</span>
        </div>
        <button
          onClick={() => {
            if (identities.length === 0) { toastInfo('لا توجد بيانات مطابقة للتصدير حالياً'); return; }
            downloadCsv(identityCsvRows(identities).join('\n'), `تقرير_المخاطر_${new Date().toISOString().slice(0, 10)}.csv`);
            toastSuccess('تم تصدير تقرير تحليل الهويات كملف CSV لمراجعته مع الشؤون القانونية.');
          }}
          className="btn btn-sm w-full sm:w-auto flex items-center justify-center gap-2"
        >
          <Download size={14} />
          تصدير تقرير المخاطر
        </button>
      </div>

      <div className="table-wrap">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
              <th className="px-6 py-4 font-bold">رقم الهوية الوطنية</th>
              <th className="px-6 py-4 font-bold">اسم العميل المسجّل</th>
              <th className="px-6 py-4 font-bold">الشرائح النشطة معه</th>
              <th className="px-6 py-4 font-bold">عدد عقود التكرار</th>
              <th className="px-6 py-4 font-bold">الوكيل/البائع المسجّل</th>
              <th className="px-6 py-4 font-bold">آخر نشاط</th>
              <th className="px-6 py-4 font-bold">مستوى الخطورة الإحصائي</th>
              <th className="px-6 py-4 font-bold">منطقة التوزيع</th>
              <th className="px-6 py-4 font-bold text-left">الإجراءات والتحقيق</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-105">
            {identities.length > 0 && identities.map((item) => (
              <tr key={item.idNo} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-gray-900">{item.idNo}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-700">
                      {item.avatarInitials}
                    </div>
                    <span className="font-semibold text-gray-900">{item.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-gray-600">{item.simsCount} شرائح</td>
                <td className="px-6 py-4 font-mono font-bold text-secondary">{item.duplicatesCount} سجلات</td>
                <td className="px-6 py-4">
                  {(item.agentNames && item.agentNames.length > 0)
                    ? item.agentNames.join('، ')
                    : <span className="text-gray-400">غير مسجّل</span>}
                </td>
                <td className="px-6 py-4 text-[11px] text-gray-600">{formatLastActivity(item.lastActivity)}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    item.risk === 'مرتفع جداً'
                      ? 'bg-red-50 text-secondary border border-red-150'
                      : 'bg-orange-100 text-orange-700 border border-orange-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${item.risk === 'مرتفع جداً' ? 'bg-secondary' : 'bg-orange-500'}`}></span>
                    {item.risk}
                  </span>
                </td>
                <td className="px-6 py-4">{item.region}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onInspect(item)}
                      className="btn-icon bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-100"
                      title="تحليل الترابط والعمليات جغرافياً"
                    >
                      <span className="material-symbols-outlined text-lg">account_tree</span>
                    </button>
                    <button
                      onClick={() => onInspect(item)}
                      className="btn-icon hover:bg-gray-100 text-gray-500 hover:text-gray-900 border-gray-100"
                      title="تفاصيل الهوية ومستنداتها"
                    >
                      <span className="material-symbols-outlined text-lg">visibility</span>
                    </button>
                    {item.blocked ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-red-100 text-secondary border border-red-200">
                        <span className="material-symbols-outlined text-sm">lock</span>
                        محظور
                      </span>
                    ) : (
                      <>
                        <button
                          disabled={actionLoading[`flag-${item.idNo}`]}
                          onClick={() => onFlag(item.idNo, item.name)}
                          className="btn-icon hover:bg-red-50 text-secondary border-red-50 disabled:opacity-50"
                          title="وضع علامة اشتباه أمني"
                        >
                          <span className="material-symbols-outlined text-lg">flag</span>
                        </button>
                        <button
                          disabled={actionLoading[`block-${item.idNo}`]}
                          onClick={() => onBlock(item.idNo, item.name)}
                          className="btn-icon hover:bg-red-900/10 text-secondary border-red-100 font-bold disabled:opacity-50"
                          title="حظر الهوية فوراً"
                        >
                          <span className="material-symbols-outlined text-lg text-[#e02928]">block</span>
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {identities.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-500 text-xs">
                  لا توجد هويات مكررة حتى الآن — excellent!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}