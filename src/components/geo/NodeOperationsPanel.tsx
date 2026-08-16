/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Activity, AlertTriangle, CheckCircle, FileText, MapPin, Network, Shield, ShieldAlert, User, X } from 'lucide-react';
import type { DuplicateIdentityRow } from '../../api/types';
import { useToast } from '../../hooks/useToast';
import type { GraphNode, OperationLogItem } from './riskTypes';
import { downloadCsv, identityCsvRows } from './riskTypes';

interface NodeOperationsPanelProps {
  selectedNode: GraphNode | null;
  activeLogs: OperationLogItem[];
  identities: DuplicateIdentityRow[];
  actionLoading: { [key: string]: boolean };
  onClose: () => void;
  onFlag: (idNo: string, name: string) => void;
  onBlock: (idNo: string, name: string) => void;
}

export default function NodeOperationsPanel({ selectedNode, activeLogs, identities, actionLoading, onClose, onFlag, onBlock }: NodeOperationsPanelProps) {
  const { toastSuccess, toastInfo } = useToast();

  return (
    <div className="card p-5 flex flex-col justify-between min-h-[460px]">
      {selectedNode ? (
        <div className="flex flex-col h-full justify-between">
          <div>
            {/* Active target descriptor Card */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-secondary">
                  {selectedNode.type === 'city' ? (
                    <MapPin size={18} />
                  ) : selectedNode.type === 'checkpoint' ? (
                    <Shield size={18} />
                  ) : (
                    <User size={18} />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-950">{selectedNode.label}</h4>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {selectedNode.type === 'city' ? 'عقدة تجميع البيانات الإقليمية' : selectedNode.type === 'checkpoint' ? 'معبر الحماية' : `هوية كود: ${selectedNode.idNo}`}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="إغلاق التفتيش"
              >
                <X size={14} />
              </button>
            </div>

            {/* Quick stats for active node card */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-150/80 mb-4 flex justify-between text-xs text-right">
              <div>
                <p className="text-[11px] text-gray-500">درجة خطورتها</p>
                <span className={`font-bold inline-flex items-center gap-1 mt-0.5 ${selectedNode.risk === 'مرتفع جداً' ? 'text-secondary' : 'text-amber-600'}`}>
                  {selectedNode.risk || 'عادي'}
                </span>
              </div>

              {selectedNode.type === 'identity' && (
                <div className="border-r border-gray-200 pr-3">
                  <p className="text-[11px] text-gray-500">الشرائح المسجلة</p>
                  <span className="font-bold text-gray-950 mt-0.5 block">{selectedNode.sims} شريحة</span>
                </div>
              )}

              <div className="border-r border-gray-200 pr-3">
                <p className="text-[11px] text-gray-500">المنطقة الجغرافية</p>
                <span className="font-bold text-gray-950 mt-0.5 block">{selectedNode.region || 'المركز المركزي'}</span>
              </div>
            </div>

            {/* Header Title Operations Log */}
            <h5 className="font-bold text-gray-950 text-xs mb-3 flex items-center gap-1">
              <Activity size={12} className="text-secondary" />
              سجل العمليات والتحقق المباشر
            </h5>

            {/* Operations Log lists */}
            <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
              {activeLogs.length > 0 ? (
                activeLogs.map((item: OperationLogItem) => (
                  <div key={item.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-150 flex flex-col gap-1 text-right">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-gray-450 font-sans">{item.time}</span>
                      <span className={`px-1.5 py-0.25 text-[10px] font-bold rounded-full border ${
                        item.status === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                        item.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {item.status === 'success' ? 'عملية ناجحة' : item.status === 'failed' ? 'عملية مرفوضة' : 'إنذار اشتباه'}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-gray-900">{item.action}</p>
                    <p className="text-[11px] text-gray-500 leading-normal">{item.details}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-gray-400 font-medium">
                  لا تتوفر سجلات عمليات إضافية لهذه العقدة بالنظام.
                </div>
              )}
            </div>
          </div>

          {/* Target node actions */}
          <div className="pt-4 border-t border-gray-100 flex flex-col gap-2 mt-4 text-xs font-bold">
            {selectedNode.type === 'identity' ? (
              selectedNode.blocked ? (
                <div className="w-full py-2.5 bg-red-100 text-secondary border border-red-200 rounded-lg flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  هذه الهوية محظورة حالياً
                </div>
              ) : (
                <>
                  <button
                    disabled={actionLoading[`flag-${selectedNode.idNo}`]}
                    onClick={() => onFlag(selectedNode.idNo ?? '', selectedNode.label)}
                    className="w-full py-2.5 bg-red-100/50 hover:bg-red-100 text-secondary border border-red-200 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ShieldAlert size={14} />
                    وضع علامة اشتباه أمني فوراً
                  </button>
                  <button
                    disabled={actionLoading[`block-${selectedNode.idNo}`]}
                    onClick={() => onBlock(selectedNode.idNo ?? '', selectedNode.label)}
                    className="w-full py-2.5 bg-[#e02928] text-white rounded-lg flex items-center justify-center gap-1.5 hover:bg-red-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <AlertTriangle size={14} />
                    تجميد وحظر الهوية فورا
                  </button>
                </>
              )
            ) : (
              <button
                onClick={() => {
                  const regionRows = identities.filter(
                    (i) => (selectedNode.region && i.region === selectedNode.region) || i.region === selectedNode.label || i.idNo === selectedNode.label || i.name === selectedNode.label
                  );
                  if (regionRows.length === 0) { toastInfo('لا توجد هويات مسجلة لهذه العقدة للتصدير حالياً'); return; }
                  downloadCsv(identityCsvRows(regionRows).join('\n'), `تقرير_منطقة_${selectedNode.label}_${new Date().toISOString().slice(0, 10)}.csv`);
                  toastSuccess(`تم تصدير سجل تكرار الهويات لمنطقة: ${selectedNode.label}`);
                }}
                className="w-full py-2.5 bg-primary text-white rounded-lg flex items-center justify-center gap-1.5 hover:opacity-90 shadow-sm transition-all cursor-pointer"
              >
                <FileText size={14} />
                تصدير تقرير المنطقة الجغرافي
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Inside Column empty instruction status panel */
        <div className="flex flex-col items-center justify-center h-full text-center py-10 px-4">
          <div className="w-14 h-14 bg-red-50 text-secondary rounded-full flex items-center justify-center mb-4 border border-red-100 shadow-sm animate-bounce">
            <Network size={24} />
          </div>
          <h4 className="text-sm font-bold text-gray-900">تشريح الهويات وتقاطع المناطق</h4>
          <p className="text-xs text-text-muted leading-relaxed max-w-[240px] mt-2">
            يرجى النقر على أي عُقدة تفاعلية في خريطة التوصيل الجانبية (D3) لاستخلاص وتحليل سجل تلاعب الهويات عبر شبكة توزيع الشرائح تلقائياً.
          </p>
          <div className="mt-6 flex flex-col gap-2 w-full text-xs font-medium text-gray-600">
            <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-150 text-right">
              <CheckCircle className="text-green-500 shrink-0" size={14} />
              <span>تحليل التقاطعات وتحديد الهويات المستعارة</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-150 text-right">
              <CheckCircle className="text-green-500 shrink-0" size={14} />
              <span>استعراض وتحليل الهويات المكررة عبر الشبكة لحظياً</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}