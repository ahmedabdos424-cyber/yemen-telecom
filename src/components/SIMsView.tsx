/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { SIM, Agent, Seller } from '../types';
import type { CreateSimBatchRequest, SimBatchResult } from '../api/types';
import { Upload } from 'lucide-react';
import { StatsCardSkeleton } from './shared/Skeleton';
import { useDebounce } from '../hooks/useDebounce';
import { useToast, ToastContainer } from '../hooks/useToast';
import OperatorLogo from './shared/OperatorLogo';
import AddSimModal from './AddSimModal';

interface SIMsViewProps {
  sims: SIM[];
  onAddSIM: (sim: Partial<SIM>) => void;
  initialSearch?: string;
  onUpdateSIM?: (id: string, fields: Partial<SIM>) => void;
  onAddSimBatch?: (payload: CreateSimBatchRequest) => Promise<SimBatchResult | void>;
  agents?: Agent[];
  sellers?: Seller[];
}

const SIM_STATUS_LABELS: Record<string, string> = {
  available: 'متاح',
  assigned: 'مسندة',
  activated: 'مفعّلة',
  sold: 'مباع',
  reserved: 'محجوز',
  inactive: 'غير نشط',
  suspended: 'معلّقة',
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'available': return 'badge-available';
    case 'sold':
    case 'activated': return 'badge-sold';
    case 'reserved':
    case 'assigned': return 'badge-reserved';
    default: return 'badge-inactive';
  }
}

function statusLabel(status: string): string {
  return SIM_STATUS_LABELS[status] || 'تالف';
}

function SIMsView({ sims = [], onAddSIM, initialSearch, onUpdateSIM, onAddSimBatch, agents = [], sellers = [] }: SIMsViewProps) {
  const { toasts, dismissToast, toastSuccess, toastError, toastWarning, toastInfo } = useToast();
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
  const [editPhone, setEditPhone] = useState('');
  const [editProvider, setEditProvider] = useState<'Yemen Mobile' | 'Sabafon' | 'YOU'>('Yemen Mobile');
  const [editPackage, setEditPackage] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [editStatus, setEditStatus] = useState<'available' | 'assigned' | 'activated' | 'sold' | 'reserved' | 'inactive'>('available');

  const openEditModal = useCallback((sim: SIM) => {
    setSelectedSimEdit(sim);
    setEditPhone(sim.phone ?? '');
    setEditProvider(sim.provider as 'Yemen Mobile' | 'Sabafon' | 'YOU');
    setEditPackage(sim.packageType ?? '');
    setEditOwner(sim.owner ?? '');
    setEditStatus(sim.status as 'available' | 'assigned' | 'activated' | 'sold' | 'reserved' | 'inactive');
  }, []);

  const handleEditSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSimEdit || !onUpdateSIM) return;
    onUpdateSIM(selectedSimEdit.id, {
      phone: editPhone,
      provider: editProvider,
      packageType: editPackage,
      owner: editOwner,
      status: editStatus,
    });
    setSelectedSimEdit(null);
  }, [selectedSimEdit, onUpdateSIM, editPhone, editProvider, editPackage, editOwner, editStatus]);

  // CSV import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<Partial<SIM>[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const csvFileRef = useRef<HTMLInputElement>(null);



  // Dynamically extract unique values for advanced filtering
  const uniqueOwners = useMemo(() => Array.from(new Set(sims.map((s) => s.owner).filter(Boolean))).sort(), [sims]);
  const uniquePackages = useMemo(() => Array.from(new Set(sims.map((s) => s.packageType).filter(Boolean))).sort(), [sims]);

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

  // Text highlighting utility
  const highlightMatches = useCallback((text: string, search: string) => {
    if (!text) return '';
    if (!search.trim()) return <span>{text}</span>;

    // Split search into tokens for separate matching
    const cleanSearch = search.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const tokens = cleanSearch.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return <span>{text}</span>;

    // Safe regex pattern matching any of the tokens
    const pattern = new RegExp(`(${tokens.join('|')})`, 'gi');
    const parts = text.split(pattern);

    return (
      <span>
        {parts.map((part, index) => {
          const isMatch = tokens.some(
            (token) => part.toLowerCase() === token.toLowerCase()
          );
          return isMatch ? (
            <mark key={index} className="bg-amber-100 text-amber-955 font-semibold px-0.5 rounded shadow-sm border-b border-amber-300">
              {part}
            </mark>
          ) : (
            part
          );
        })}
      </span>
    );
  }, []);

  const stats = useMemo(() => ({
    total: sims.length,
    available: sims.filter((s) => s.status === 'available').length,
    assigned: sims.filter((s) => s.status === 'assigned').length,
    activated: sims.filter((s) => s.status === 'activated').length,
    reserved: sims.filter((s) => s.status === 'reserved').length,
    inactive: sims.filter((s) => s.status === 'inactive').length
  }), [sims]);

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

  const handleCSVFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? '';
      if (!text) { setCsvPreview([]); return; }
      const lines = text.split('\n').filter(line => (line ?? '').trim());
      if (lines.length === 0) { setCsvPreview([]); return; }
      const records: Partial<SIM>[] = [];
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 2) continue;
        const record: Record<string, string> = {};
        headers.forEach((h, idx) => { record[h] = values[idx] || ''; });
        const provider = record['provider'] || record['الشبكة'] || 'Yemen Mobile';
        records.push({
          phone: record['phone'] || record['رقم الهاتف'] || '',
          iccid: record['iccid'] || record['الرقم التسلسلي'] || '',
          provider: (provider === 'Sabafon' || provider === 'YOU' ? provider : 'Yemen Mobile') as 'Yemen Mobile' | 'Sabafon' | 'YOU',
          packageType: record['package'] || record['package_type'] || record['الباقة'] || 'باقة مزايا الشهرية',
          owner: record['owner'] || record['المالك'] || 'المركز الرئيسي',
          status: 'available',
          dateAdded: new Date().toLocaleDateString('ar-YE'),
        });
      }
      setCsvPreview(records);
    };
    reader.readAsText(file);
  }, []);

  const handleImportCSV = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (csvPreview.length === 0) return;
    setCsvImporting(true);
    let imported = 0;
    csvPreview.forEach(sim => {
      if (sim.phone && sim.iccid) {
        onAddSIM(sim);
        imported++;
      }
    });
    setCsvImporting(false);
    setCsvFile(null);
    setCsvPreview([]);
    setShowImportModal(false);
    toastSuccess(`تم استيراد ${imported} شريحة بنجاح من ملف CSV.`);
  }, [csvPreview, onAddSIM]);

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
      {sims.length === 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
      ) : (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        <div className="stat-card stat-card-ym">
          <div className="flex justify-between items-start mb-1.5 md:mb-2">
            <OperatorLogo provider="yemen_mobile" size="sm" />
            <span className="text-[10px] md:text-[11px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">+12%</span>
          </div>
          <p className="text-gray-400 text-[10px] md:text-[11px] font-bold">إجمالي الشرائح</p>
          <h4 className="stat-card-value font-mono">{stats.total}</h4>
        </div>

        <div className="stat-card">
          <div className="flex justify-between items-start mb-1.5 md:mb-2">
            <span className="material-symbols-outlined text-green-600 bg-green-50 border border-green-100 p-1.5 md:p-2 rounded-lg text-xs md:text-sm">check_circle</span>
            <span className="text-[10px] md:text-[11px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">جاهز</span>
          </div>
          <p className="text-gray-400 text-[10px] md:text-[11px] font-bold">المتاحة للبيع</p>
          <h4 className="stat-card-value font-mono">{stats.available}</h4>
        </div>

        <div className="stat-card">
          <div className="flex justify-between items-start mb-1.5 md:mb-2">
            <span className="material-symbols-outlined text-indigo-600 bg-indigo-50 border border-indigo-100 p-1.5 md:p-2 rounded-lg text-xs md:text-sm">assignment_turned_in</span>
            <span className="text-[10px] md:text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">مسندة</span>
          </div>
          <p className="text-gray-400 text-[10px] md:text-[11px] font-bold">المسندة لوكلاء/بائعين</p>
          <h4 className="stat-card-value font-mono">{stats.assigned}</h4>
        </div>

        <div className="stat-card">
          <div className="flex justify-between items-start mb-1.5 md:mb-2">
            <span className="material-symbols-outlined text-teal-600 bg-teal-50 border border-teal-100 p-1.5 md:p-2 rounded-lg text-xs md:text-sm">verified</span>
            <span className="text-[10px] md:text-[11px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-full">مفعّلة</span>
          </div>
          <p className="text-gray-400 text-[10px] md:text-[11px] font-bold">المفعّلة للعملاء</p>
          <h4 className="stat-card-value font-mono">{stats.activated}</h4>
        </div>

        <div className="stat-card">
          <div className="flex justify-between items-start mb-1.5 md:mb-2">
            <span className="material-symbols-outlined text-yellow-600 bg-yellow-50 border border-yellow-100 p-1.5 md:p-2 rounded-lg text-xs md:text-sm">pending_actions</span>
            <span className="text-[10px] md:text-[11px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">محجوز</span>
          </div>
          <p className="text-gray-400 text-[10px] md:text-[11px] font-bold">المحجوزة مؤقتاً</p>
          <h4 className="stat-card-value font-mono">{stats.reserved}</h4>
        </div>

        <div className="stat-card">
          <div className="flex justify-between items-start mb-1.5 md:mb-2">
            <span className="material-symbols-outlined text-red-600 bg-red-50 border border-red-100 p-1.5 md:p-2 rounded-lg text-xs md:text-sm font-bold">block</span>
            <span className="text-[10px] md:text-[11px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">تالف</span>
          </div>
          <p className="text-gray-400 text-[10px] md:text-[11px] font-bold">غير نشطة / تالفة</p>
          <h4 className="stat-card-value font-mono">{stats.inactive}</h4>
        </div>
      </div>
      )}

      {/* Advanced search and dropdown filters row */}
      <div className="card p-3 md:p-4 space-y-2.5 md:space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5 md:gap-3">
          <div className="input-group flex-1">
            <span className="material-symbols-outlined input-icon">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث برقم الهاتف، الرقم التسلسلي ICCID، المالك أو باقة الشريحة..."
              className="input-field"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Dropdowns row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-2.5">
          <div className="lg:col-span-1 col-span-2">
            <label className="block text-[10px] md:text-[11px] text-gray-400 font-bold mb-1">الشبكة المزودة</label>
            <div className="flex gap-1.5 md:gap-2 overflow-x-auto hide-scrollbar pb-0.5 snap-dashboard-filters">
              <button
                type="button"
                onClick={() => setSelectedProvider('all')}
                className={`min-h-[44px] px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-bold border-2 transition-all duration-200 flex items-center gap-1.5 md:gap-2 active:scale-[0.97] shrink-0 snap-start ${selectedProvider === 'all' ? 'bg-gray-800 text-white border-gray-600 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'}`}
              >
                <span className="material-symbols-outlined text-base md:text-lg">apps</span>
                الكل
              </button>
              <button
                type="button"
                onClick={() => setSelectedProvider('Yemen Mobile')}
                className={`min-h-[44px] px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-bold border-2 transition-all duration-200 flex items-center gap-1.5 md:gap-2 active:scale-[0.97] shrink-0 snap-start ${selectedProvider === 'Yemen Mobile' ? 'bg-op-ym border-op-ym shadow-lg text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-op-ym/60 hover:bg-op-ym-light'}`}
              >
                <OperatorLogo provider="Yemen Mobile" size="md" plain />
                <span>يمن موبايل</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedProvider('Sabafon')}
                className={`min-h-[44px] px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-bold border-2 transition-all duration-200 flex items-center gap-1.5 md:gap-2 active:scale-[0.97] shrink-0 snap-start ${selectedProvider === 'Sabafon' ? 'bg-op-sf border-op-sf shadow-lg text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-op-sf/60 hover:bg-op-sf-light'}`}
              >
                <OperatorLogo provider="Sabafon" size="md" plain />
                <span>سبأفون</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedProvider('YOU')}
                className={`min-h-[44px] px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-bold border-2 transition-all duration-200 flex items-center gap-1.5 md:gap-2 active:scale-[0.97] shrink-0 snap-start ${selectedProvider === 'YOU' ? 'bg-op-you border-op-you shadow-lg text-you-text' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-op-you/60 hover:bg-op-you-light'}`}
              >
                <OperatorLogo provider="YOU" size="md" plain />
                <span>YOU</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] md:text-[11px] text-gray-400 font-bold mb-1">حالة الشريحة</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100/75 text-gray-700 outline-none min-h-[44px]"
            >
              <option value="all">كل الحالات</option>
              <option value="available">متاح</option>
              <option value="assigned">مسندة</option>
              <option value="activated">مفعّلة</option>
              <option value="sold">مباع</option>
              <option value="reserved">محجوز</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] md:text-[11px] text-gray-400 font-bold mb-1">المالك / الوكيل الموزع</label>
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100/75 text-gray-700 outline-none min-h-[44px]"
            >
              <option value="all">كل الملاك والموزعين</option>
              {uniqueOwners.map(owner => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] md:text-[11px] text-gray-400 font-bold mb-1">باقة البداية المخصصة</label>
            <select
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100/75 text-gray-700 outline-none min-h-[44px]"
            >
              <option value="all">كل الباقات</option>
              {uniquePackages.map(pkg => (
                <option key={pkg} value={pkg}>{pkg}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active badges & clear all */}
        {(searchTerm || selectedProvider !== 'all' || selectedStatus !== 'all' || selectedOwner !== 'all' || selectedPackage !== 'all') && (
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2 pt-2 border-t border-gray-100 text-[10px] md:text-[11px]">
            <span className="text-gray-400 font-bold">نشط التصفية:</span>
            
            {searchTerm && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                نص البحث: "{searchTerm}"
                <button type="button" onClick={() => setSearchTerm('')} className="hover:text-amber-900 font-bold font-mono">✕</button>
              </span>
            )}
            {selectedProvider !== 'all' && (
              <span className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-full font-semibold ${
                selectedProvider === 'Yemen Mobile' ? 'bg-op-ym-light border-op-ym' : 
                selectedProvider === 'Sabafon' ? 'bg-op-sf-light border-op-sf' :
                'bg-op-you-light border-op-you'
              }`}>
                الشبكة: {selectedProvider === 'Yemen Mobile' ? 'يمن موبايل' : selectedProvider === 'Sabafon' ? 'سبأفون' : 'يو'}
                <button type="button" onClick={() => setSelectedProvider('all')} className="font-bold font-mono">✕</button>
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-green-50 text-green-800 border border-green-200 px-2 py-0.5 rounded-full font-semibold">
                الحالة: {statusLabel(selectedStatus)}
                <button type="button" onClick={() => setSelectedStatus('all')} className="hover:text-green-950 font-bold font-mono">✕</button>
              </span>
            )}
            {selectedOwner !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-850 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
                المالك: {selectedOwner}
                <button type="button" onClick={() => setSelectedOwner('all')} className="hover:text-purple-900 font-bold font-mono">✕</button>
              </span>
            )}
            {selectedPackage !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-850 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold">
                الباقة: {selectedPackage}
                <button type="button" onClick={() => setSelectedPackage('all')} className="hover:text-indigo-900 font-bold font-mono">✕</button>
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedProvider('all');
                setSelectedStatus('all');
                setSelectedOwner('all');
                setSelectedPackage('all');
              }}
              className="text-secondary hover:underline mr-auto font-bold text-[11px]"
            >
              مسح تصفية الكل
            </button>
          </div>
        )}
      </div>

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
            <div
              key={sim.id}
              className="card p-3 md:p-4 flex flex-col justify-between hover:shadow-md transition-shadow active:scale-[0.99] content-visibility-auto contain-strict"
            >
              <div className="flex justify-between items-start mb-2.5 md:mb-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                  <OperatorLogo provider={sim.provider} size="sm" />
                  <div className="min-w-0">
                    <p className="text-[11px] md:text-xs font-bold text-gray-900 font-mono truncate">{highlightMatches(sim.phone ?? '', searchTerm)}</p>
                    <p className="text-[10px] md:text-[11px] text-gray-500 font-mono mt-0.5 truncate">{highlightMatches(sim.iccid, searchTerm)}</p>
                  </div>
                </div>
                  <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
                    <span className={`op-pill flex items-center gap-1 text-[10px] md:text-[11px] ${
                      sim.provider === 'Yemen Mobile' ? 'op-pill-ym' : sim.provider === 'Sabafon' ? 'op-pill-sf' : 'op-pill-you'
                    }`}>
                      <OperatorLogo provider={sim.provider} size="sm" />
                    </span>
                    <span className={`badge text-[10px] md:text-[11px] ${statusBadgeClass(sim.status)}`}>
                      {statusLabel(sim.status)}
                    </span>
                  </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 md:pt-3 border-t border-gray-100 mt-1.5 md:mt-2">
                <div className="text-[10px] md:text-[11px] flex-1 min-w-0 pl-1 md:pl-2">
                  <p className="text-gray-400 font-semibold mb-0.5">الباقة والمالك</p>
                  <p className="font-bold text-gray-800 text-[10px] md:text-[11px] truncate">
                    {highlightMatches(sim.packageType ?? '', searchTerm)} | {highlightMatches(sim.owner ?? '', searchTerm)}
                  </p>
                </div>
                <div className="flex gap-1.5 md:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedSimDetail(sim)}
                    className="touch-target p-2.5 md:p-3 text-gray-600 hover:text-secondary bg-gray-100 rounded-xl transition-colors border border-gray-200 cursor-pointer"
                    title="عرض التفاصيل"
                  >
                    <span className="material-symbols-outlined text-base md:text-lg">visibility</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(sim)}
                    className="touch-target p-2.5 md:p-3 text-gray-600 hover:text-secondary bg-gray-100 rounded-xl transition-colors border border-gray-200 cursor-pointer"
                    title="تعديل الشريحة"
                  >
                    <span className="material-symbols-outlined text-base md:text-lg">edit_note</span>
                  </button>
                </div>
              </div>
            </div>
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
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm md:max-w-md overflow-hidden text-right leading-relaxed animate-in fade-in zoom-in-95 duration-200 border border-gray-100/80">
            <div className="px-6 py-4.5 bg-gray-50 border-b border-gray-150 flex justify-between items-center">
              <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-gray-150/70 rounded-full text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">upload_file</span>
                استيراد شرائح من ملف CSV
              </h3>
            </div>
            <form onSubmit={handleImportCSV} className="p-6 space-y-5">
              <input ref={csvFileRef} type="file" accept=".csv" onChange={handleCSVFileChange} className="hidden" />
              <div
                onClick={() => csvFileRef.current?.click()}
                className="border-2 border-dashed border-gray-250 rounded-2xl p-6.5 text-center space-y-2.5 bg-gray-50/50 hover:bg-gray-50 hover:border-secondary/50 transition-colors duration-200 group cursor-pointer"
              >
                <Upload size={32} className="mx-auto text-gray-400 group-hover:scale-105 group-hover:text-secondary transition-all" />
                <p className="text-xs text-gray-650 font-bold">{csvFile ? csvFile.name : 'اسحب ملف CSV أو قم بالتصفح'}</p>
                <p className="text-[11px] text-gray-400">الأعمدة المدعومة: phone, iccid, provider, package, owner</p>
              </div>
              {csvPreview.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 max-h-32 overflow-y-auto">
                  <p className="text-[11px] text-gray-600 font-bold mb-1">تم التعرف على {csvPreview.length} سجل:</p>
                  {csvPreview.slice(0, 5).map((sim, i) => (
                    <p key={i} className="text-[10px] text-gray-500 font-mono">{sim.phone} | {sim.iccid}</p>
                  ))}
                  {csvPreview.length > 5 && <p className="text-[10px] text-gray-400">...و{csvPreview.length - 5} سجل آخر</p>}
                </div>
              )}
              <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setShowImportModal(false); setCsvFile(null); setCsvPreview([]); }}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 bg-white hover:bg-gray-55/70 rounded-xl text-xs font-bold transition-all hover:border-gray-300 cursor-pointer w-full sm:w-auto"
                >
                  إلغاء التوريد
                </button>
                <button
                  type="submit"
                  disabled={csvPreview.length === 0 || csvImporting}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:brightness-110 shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 w-full sm:w-auto"
                >
                  {csvImporting ? 'جارٍ الاستيراد...' : `بدء استيراد ${csvPreview.length} شريحة`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* SIM Detail Modal */}
      {selectedSimDetail && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-right leading-relaxed animate-in fade-in zoom-in-95 duration-200 border border-gray-100/80">
            <div className="px-6 py-4.5 bg-gray-50 border-b border-gray-150 flex justify-between items-center">
              <button onClick={() => setSelectedSimDetail(null)} className="p-2 hover:bg-gray-150/70 rounded-full text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
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
                  <p className="text-sm font-bold font-mono text-gray-900">{selectedSimDetail.phone}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold mb-1">ICCID</p>
                  <p className="text-sm font-bold font-mono text-gray-900">{selectedSimDetail.iccid}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold mb-1">الشبكة</p>
                  <p className="text-sm font-bold text-gray-900">{selectedSimDetail.provider}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold mb-1">الحالة</p>
                  <span className={`badge ${statusBadgeClass(selectedSimDetail.status)}`}>
                    {statusLabel(selectedSimDetail.status)}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-gray-400 font-bold mb-1">باقة البداية</p>
                  <p className="text-sm font-bold text-gray-900">{selectedSimDetail.packageType}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-gray-400 font-bold mb-1">المالك</p>
                  <p className="text-sm font-bold text-gray-900">{selectedSimDetail.owner}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-gray-400 font-bold mb-1">تاريخ الإضافة</p>
                  <p className="text-sm font-bold text-gray-900">{selectedSimDetail.dateAdded}</p>
                </div>
              </div>
              <div className="flex justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setSelectedSimDetail(null); openEditModal(selectedSimDetail); }}
                  className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:brightness-110 shadow-md active:scale-[0.98] transition-all cursor-pointer"
                >
                  تعديل الشريحة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIM Edit Modal */}
      {selectedSimEdit && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md lg:max-w-lg overflow-hidden text-right leading-relaxed animate-in fade-in zoom-in-95 duration-200 border border-gray-100/80">
            <div className="px-6 py-4.5 bg-gray-50 border-b border-gray-150 flex justify-between items-center">
              <button onClick={() => setSelectedSimEdit(null)} className="p-2 hover:bg-gray-150/70 rounded-full text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
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
                    onChange={(e) => setEditProvider(e.target.value as 'Yemen Mobile' | 'Sabafon' | 'YOU')}
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
                    onChange={(e) => setEditStatus(e.target.value as 'available' | 'assigned' | 'activated' | 'sold' | 'reserved' | 'inactive')}
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
                  onClick={() => setSelectedSimEdit(null)}
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

export default React.memo(SIMsView);
