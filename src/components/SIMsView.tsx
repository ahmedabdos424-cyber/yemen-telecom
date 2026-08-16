/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useCallback, memo } from 'react';
import { SIM, Agent, Seller } from '../types';
import type { CreateSimBatchRequest, SimBatchResult } from '../api/types';
import { useDebounce } from '../hooks/useDebounce';
import { useToast, ToastContainer } from '../hooks/useToast';
import AddSimModal from './AddSimModal';
import SimStatsGrid, { type SimStats } from './sims/SimStatsGrid';
import SimFiltersBar from './sims/SimFiltersBar';
import SimCard from './sims/SimCard';
import SimCsvImportModal from './sims/SimCsvImportModal';
import SimDetailModal from './sims/SimDetailModal';
import SimEditModal from './sims/SimEditModal';

interface SIMsViewProps {
  sims: SIM[];
  onAddSIM: (sim: Partial<SIM>) => void;
  initialSearch?: string;
  onUpdateSIM?: (id: string, fields: Partial<SIM>) => void;
  onAddSimBatch?: (payload: CreateSimBatchRequest) => Promise<SimBatchResult | void>;
  agents?: Agent[];
  sellers?: Seller[];
}

function SIMsView({ sims = [], onAddSIM, initialSearch, onUpdateSIM, onAddSimBatch, agents = [], sellers = [] }: SIMsViewProps) {
  const { toasts, dismissToast, toastSuccess, toastError, toastWarning } = useToast();
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [selectedPackage, setSelectedPackage] = useState<string>('all');

  // States for the add SIM dialogs
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const [selectedSimDetail, setSelectedSimDetail] = useState<SIM | null>(null);
  const [selectedSimEdit, setSelectedSimEdit] = useState<SIM | null>(null);

  // Dynamically extract unique values for advanced filtering
  const uniqueOwners = useMemo(() => Array.from(new Set(sims.map((s) => s.owner).filter((o): o is string => Boolean(o)))).sort(), [sims]);
  const uniquePackages = useMemo(() => Array.from(new Set(sims.map((s) => s.packageType).filter((p): p is string => Boolean(p)))).sort(), [sims]);

  // Filter & Search computation with multi-filter query support
  const filteredSIMs = useMemo(() => sims.filter((sim) => {
    const searchTokens = debouncedSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matchesSearch = searchTokens.length === 0 || searchTokens.every(token =>
      sim.phone?.toLowerCase().includes(token) ||
      (sim.iccid ?? '').toLowerCase().includes(token) ||
      (sim.owner ?? '').toLowerCase().includes(token) ||
      (sim.packageType ?? '').toLowerCase().includes(token)
    );

    const matchesProvider = selectedProvider === 'all' || sim.provider === selectedProvider;
    const matchesStatus = selectedStatus === 'all' || sim.status === selectedStatus;
    const matchesOwner = selectedOwner === 'all' || sim.owner === selectedOwner;
    const matchesPackage = selectedPackage === 'all' || sim.packageType === selectedPackage;

    return matchesSearch && matchesProvider && matchesStatus && matchesOwner && matchesPackage;
  }), [sims, debouncedSearch, selectedProvider, selectedStatus, selectedOwner, selectedPackage]);

  const stats = useMemo<SimStats>(() => ({
    total: sims.length,
    available: sims.filter((s) => s.status === 'available').length,
    assigned: sims.filter((s) => s.status === 'assigned').length,
    activated: sims.filter((s) => s.status === 'activated').length,
    reserved: sims.filter((s) => s.status === 'reserved').length,
    inactive: sims.filter((s) => s.status === 'inactive').length
  }), [sims]);

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedProvider('all');
    setSelectedStatus('all');
    setSelectedOwner('all');
    setSelectedPackage('all');
  }, []);

  const handleBatchSubmit = useCallback(async (payload: CreateSimBatchRequest) => {
    if (!onAddSimBatch) return;
    try {
      const res = await onAddSimBatch(payload);
      if (res && res.created > 0) {
        toastSuccess(`تم إضافة النطاق بنجاح وتخصيصه لمخزون ${res.owner || 'المركز الرئيسي'}.${res.skipped > 0 ? ` (تخطي ${res.skipped} مكررة)` : ''}`);
        setShowBatchModal(false);
      } else if (res) {
        toastWarning('لم تُضف أي شريحة جديدة — كل أرقام النطاق موجودة مسبقاً.');
        setShowBatchModal(false);
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'فشل إضافة الدفعة إلى المخزون');
    }
  }, [onAddSimBatch, toastSuccess, toastError, toastWarning]);

  const handleImportCSV = useCallback((records: Partial<SIM>[]) => {
    let imported = 0;
    records.forEach(sim => {
      if (sim.phone && sim.iccid) {
        onAddSIM(sim);
        imported++;
      }
    });
    toastSuccess(`تم استيراد ${imported} شريحة بنجاح من ملف CSV.`);
  }, [onAddSIM, toastSuccess]);

  const handleSimUpdate = useCallback((fields: Partial<SIM>) => {
    if (!selectedSimEdit || !onUpdateSIM) return;
    onUpdateSIM(selectedSimEdit.id, fields);
    setSelectedSimEdit(null);
  }, [selectedSimEdit, onUpdateSIM]);

  return (
    <div className="space-y-4 md:space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* Header and Add Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
        <div>
          <h2 className="font-headline-lg text-sm md:text-xl font-bold text-gray-900">إدارة ومخزن شرائح الاتصال</h2>

        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* CSV Import */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex-1 md:flex-none btn btn-ghost text-[11px] md:text-[13px]"
          >
            <span className="material-symbols-outlined text-sm">upload_file</span>
            <span className="hidden 2xs:inline">استيراد CSV</span>
          </button>
          {/* Batch (range) insert */}
          {onAddSimBatch && (
            <button
              onClick={() => setShowBatchModal(true)}
              className="flex-1 md:flex-none btn btn-ghost text-[11px] md:text-[13px]"
            >
              <span className="material-symbols-outlined text-sm">inventory_2</span>
              <span className="hidden 2xs:inline">إضافة دفعة (نطاق)</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary counters grid */}
      <SimStatsGrid stats={stats} loading={sims.length === 0} />

      {/* Advanced search and dropdown filters row */}
      <SimFiltersBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedProvider={selectedProvider}
        onProviderChange={setSelectedProvider}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedOwner={selectedOwner}
        onOwnerChange={setSelectedOwner}
        selectedPackage={selectedPackage}
        onPackageChange={setSelectedPackage}
        uniqueOwners={uniqueOwners}
        uniquePackages={uniquePackages}
        onClearAll={clearAllFilters}
      />

      {/* Dynamic Data Grid cards and List */}
      <div className="space-y-3 md:space-y-4">
        <div className="flex justify-between items-center px-1">
          <h4 className="font-bold text-xs md:text-sm text-gray-800">تفاصيل مخزون الشرائح الجاري</h4>
          <span className="text-[10px] md:text-[11px] text-gray-500 font-mono">إظهار {filteredSIMs.length} من {sims.length}</span>
        </div>

        {sims.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 content-visibility-auto contain-strict">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-800 animate-pulse rounded-full w-8 h-8" />
                  <div className="space-y-2 flex-1">
                    <div className="bg-slate-800 animate-pulse rounded h-3 w-3/4" />
                    <div className="bg-slate-800 animate-pulse rounded h-2 w-1/2" />
                  </div>
                </div>
                <div className="bg-slate-800 animate-pulse rounded h-3 w-full" />
                <div className="flex justify-between">
                  <div className="bg-slate-800 animate-pulse rounded h-8 w-8" />
                  <div className="bg-slate-800 animate-pulse rounded h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredSIMs.map((sim) => (
            <SimCard
              key={sim.id}
              sim={sim}
              searchTerm={searchTerm}
              onView={setSelectedSimDetail}
              onEdit={setSelectedSimEdit}
            />
          ))}

          {filteredSIMs.length === 0 && sims.length > 0 && (
            <div className="col-span-full py-8 text-center text-gray-500 font-body-sm bg-white rounded-xl border border-gray-200">
              لا توجد شرائح مطابقة لبحثك المخصّص حالياً.
            </div>
          )}
        </div>
      )}
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <SimCsvImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportCSV}
        />
      )}
      {/* SIM Detail Modal */}
      {selectedSimDetail && (
        <SimDetailModal
          sim={selectedSimDetail}
          onClose={() => setSelectedSimDetail(null)}
          onEdit={(sim) => { setSelectedSimDetail(null); setSelectedSimEdit(sim); }}
        />
      )}
      {/* SIM Edit Modal */}
      {selectedSimEdit && (
        <SimEditModal
          key={selectedSimEdit.id}
          sim={selectedSimEdit}
          onClose={() => setSelectedSimEdit(null)}
          onSubmit={handleSimUpdate}
        />
      )}

      {/* Batch Insert Modal */}
      {showBatchModal && onAddSimBatch && (
        <AddSimModal
          agents={agents}
          sellers={sellers}
          onClose={() => setShowBatchModal(false)}
          onSubmit={handleBatchSubmit}
        />
      )}
    </div>
  );
}

export default memo(SIMsView);