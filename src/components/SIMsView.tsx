/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from 'react';
import { SIM } from '../types';
import { Upload } from 'lucide-react';
import CameraCapture from './shared/CameraCapture';
import { StatsCardSkeleton } from './shared/Skeleton';

interface SIMsViewProps {
  sims: SIM[];
  onAddSIM: (sim: Partial<SIM>) => void;
}

export default function SIMsView({ sims, onAddSIM }: SIMsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [selectedPackage, setSelectedPackage] = useState<string>('all');
  
  // States for the add SIM dialog
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Add SIM form fields
  const [formPhone, setFormPhone] = useState('');
  const [formIccid, setFormIccid] = useState('');
  const [formProvider, setFormProvider] = useState<'Yemen Mobile' | 'Sabafon' | 'YOU'>('Yemen Mobile');
  const [formPackage, setFormPackage] = useState('باقة مزايا الشهرية');
  const [formOwner, setFormOwner] = useState('المركز الرئيسي');

  // CSV import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<Partial<SIM>[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const csvFileRef = useRef<HTMLInputElement>(null);



  // Dynamically extract unique values for advanced filtering
  const uniqueOwners = Array.from(new Set(sims.map((s) => s.owner).filter(Boolean))).sort();
  const uniquePackages = Array.from(new Set(sims.map((s) => s.packageType).filter(Boolean))).sort();

  // Filter & Search computation with multi-filter query support
  const filteredSIMs = useMemo(() => sims.filter((sim) => {
    const searchTokens = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matchesSearch = searchTokens.length === 0 || searchTokens.every(token => 
      sim.phone?.toLowerCase().includes(token) || 
      sim.iccid.toLowerCase().includes(token) || 
      sim.owner.toLowerCase().includes(token) || 
      sim.packageType.toLowerCase().includes(token)
    );

    const matchesProvider = selectedProvider === 'all' || sim.provider === selectedProvider;
    const matchesStatus = selectedStatus === 'all' || sim.status === selectedStatus;
    const matchesOwner = selectedOwner === 'all' || sim.owner === selectedOwner;
    const matchesPackage = selectedPackage === 'all' || sim.packageType === selectedPackage;

    return matchesSearch && matchesProvider && matchesStatus && matchesOwner && matchesPackage;
  }), [sims, searchTerm, selectedProvider, selectedStatus, selectedOwner, selectedPackage]);

  // Text highlighting utility
  const highlightMatches = (text: string, search: string) => {
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
  };

  const stats = useMemo(() => ({
    total: sims.length,
    available: sims.filter((s) => s.status === 'available').length,
    reserved: sims.filter((s) => s.status === 'reserved').length,
    inactive: sims.filter((s) => s.status === 'inactive').length
  }), [sims]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPhone || !formIccid) return;
    onAddSIM({
      phone: formPhone,
      iccid: formIccid,
      provider: formProvider,
      packageType: formPackage,
      owner: formOwner,
      status: 'available',
      dateAdded: new Date().toLocaleDateString('ar-YE')
    });
    // Reset Form
    setFormPhone('');
    setFormIccid('');
    setShowAddModal(false);
  };

  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const records: Partial<SIM>[] = [];
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 2) continue;
        const record: Record<string, string> = {};
        headers.forEach((h, idx) => { record[h] = values[idx] || ''; });
        records.push({
          phone: record['phone'] || record['رقم الهاتف'] || '',
          iccid: record['iccid'] || record['الرقم التسلسلي'] || '',
          provider: (record['provider'] || record['الشبكة'] || 'Yemen Mobile') as any,
          packageType: record['package'] || record['package_type'] || record['الباقة'] || 'باقة مزايا الشهرية',
          owner: record['owner'] || record['المالك'] || 'المركز الرئيسي',
          status: 'available',
          dateAdded: new Date().toLocaleDateString('ar-YE'),
        });
      }
      setCsvPreview(records);
    };
    reader.readAsText(file);
  };

  const handleImportCSV = (e: React.FormEvent) => {
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
    alert(`تم استيراد ${imported} شريحة بنجاح من ملف CSV.`);
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-headline-lg text-lg md:text-xl font-bold text-gray-900">إدارة ومخزن شرائح الاتصال</h2>
          <p className="text-xs text-gray-500 mt-1">تتبع، فرز، ومراقبة مخزون الشرائح النشطة والجاهزة للتوزيع</p>
        </div>
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* CSV Import */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex-1 md:flex-none btn btn-ghost"
          >
            <span className="material-symbols-outlined text-sm">upload_file</span>
            استيراد CSV
          </button>
          {/* Manual insert SIM */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 md:flex-none btn btn-primary"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            إضافة شريحة يدوياً
          </button>
        </div>
      </div>

      {/* Summary counters grid */}
      {sims.length === 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
      ) : (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="stat-card stat-card-ym">
          <div className="flex justify-between items-start mb-2">
            <span className="material-symbols-outlined op-ym bg-op-ym-light p-2 rounded-lg text-sm">sim_card</span>
            <span className="text-[11px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">+12%</span>
          </div>
          <p className="text-gray-400 text-[11px] font-bold">إجمالي الشرائح</p>
          <h4 className="stat-card-value font-mono">{stats.total}</h4>
        </div>

        <div className="stat-card">
          <div className="flex justify-between items-start mb-2">
            <span className="material-symbols-outlined text-green-600 bg-green-50 border border-green-100 p-2 rounded-lg text-sm">check_circle</span>
            <span className="text-[11px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">جاهز</span>
          </div>
          <p className="text-gray-400 text-[11px] font-bold">المتاحة للبيع</p>
          <h4 className="stat-card-value font-mono">{stats.available}</h4>
        </div>

        <div className="stat-card">
          <div className="flex justify-between items-start mb-2">
            <span className="material-symbols-outlined text-yellow-600 bg-yellow-50 border border-yellow-100 p-2 rounded-lg text-sm">pending_actions</span>
            <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">محجوز</span>
          </div>
          <p className="text-gray-400 text-[11px] font-bold">المحجوزة مؤقتاً</p>
          <h4 className="stat-card-value font-mono">{stats.reserved}</h4>
        </div>

        <div className="stat-card">
          <div className="flex justify-between items-start mb-2">
            <span className="material-symbols-outlined text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg text-sm font-bold">block</span>
            <span className="text-[11px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">تالف</span>
          </div>
          <p className="text-gray-400 text-[11px] font-bold">غير نشطة / تالفة</p>
          <h4 className="stat-card-value font-mono">{stats.inactive}</h4>
        </div>
      </div>
      )}

      {/* Advanced search and dropdown filters row */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
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
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Dropdowns row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-[11px] text-gray-400 font-bold mb-1">الشبكة المزودة</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100/75 text-gray-700 outline-none"
            >
              <option value="all">كل الشبكات</option>
              <option value="Yemen Mobile">يمن موبايل (Yemen Mobile)</option>
              <option value="Sabafon">سبأفون (Sabafon)</option>
              <option value="YOU">يو (YOU)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-gray-400 font-bold mb-1">حالة الشريحة</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100/75 text-gray-700 outline-none"
            >
              <option value="all">كل الحالات</option>
              <option value="available">متاح</option>
              <option value="sold">مباع</option>
              <option value="reserved">محجوز</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-gray-400 font-bold mb-1">المالك / الوكيل الموزع</label>
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100/75 text-gray-700 outline-none"
            >
              <option value="all">كل الملاك والموزعين</option>
              {uniqueOwners.map(owner => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-gray-400 font-bold mb-1">باقة البداية المخصصة</label>
            <select
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100/75 text-gray-700 outline-none"
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
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-[11px]">
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
                الحالة: {selectedStatus === 'available' ? 'متاح' : selectedStatus === 'sold' ? 'مباع' : selectedStatus === 'reserved' ? 'محجوز' : 'تالف'}
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
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h4 className="font-bold text-sm text-gray-800">تفاصيل مخزون الشرائح الجاري</h4>
          <span className="text-[11px] text-gray-500 font-mono">إظهار {filteredSIMs.length} من {sims.length}</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSIMs.map((sim) => (
            <div
              key={sim.id}
              className="bg-white border border-gray-200 shadow-sm p-4 rounded-xl flex flex-col justify-between hover:shadow-md transition-shadow active:scale-[0.99] content-visibility-auto contain-strict"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] text-white ${
                    sim.provider === 'Yemen Mobile' ? 'bg-op-ym' : sim.provider === 'Sabafon' ? 'bg-op-sf' : 'bg-op-you'
                  }`}>
                    {sim.provider === 'Yemen Mobile' ? 'YM' : sim.provider === 'Sabafon' ? 'SF' : 'YOU'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 font-mono">{highlightMatches(sim.phone, searchTerm)}</p>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">{highlightMatches(sim.iccid, searchTerm)}</p>
                  </div>
                </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`op-pill ${
                      sim.provider === 'Yemen Mobile' ? 'op-pill-ym' : sim.provider === 'Sabafon' ? 'op-pill-sf' : 'op-pill-you'
                    }`}>
                      {sim.provider === 'Yemen Mobile' ? 'YM' : sim.provider === 'Sabafon' ? 'SF' : 'YOU'}
                    </span>
                    <span className={`badge ${
                      sim.status === 'available'
                        ? 'badge-available'
                        : sim.status === 'sold'
                        ? 'badge-sold'
                        : sim.status === 'reserved'
                        ? 'badge-reserved'
                        : 'badge-inactive'
                    }`}>
                      {sim.status === 'available' ? 'متاح' : sim.status === 'sold' ? 'مباع' : sim.status === 'reserved' ? 'محجوز' : 'تالف'}
                    </span>
                  </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
                <div className="text-[11px] flex-1 min-w-0 pr-1">
                  <p className="text-gray-400 font-semibold mb-0.5">باقة الشريحة والمالك</p>
                  <p className="font-bold text-gray-800 text-[11px] truncate">
                    {highlightMatches(sim.packageType, searchTerm)} | {highlightMatches(sim.owner, searchTerm)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="touch-target p-3 text-gray-600 hover:text-secondary bg-gray-100 rounded-xl transition-colors border border-gray-200 cursor-pointer">
                    <span className="material-symbols-outlined text-lg">visibility</span>
                  </button>
                  <button className="touch-target p-3 text-gray-600 hover:text-secondary bg-gray-100 rounded-xl transition-colors border border-gray-200 cursor-pointer">
                    <span className="material-symbols-outlined text-lg">edit_note</span>
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

      {/* Manual Insert Dialog Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-right leading-relaxed animate-in fade-in zoom-in-95 duration-200 border border-gray-100/80">
            <div className="px-6 py-4.5 bg-gray-50 border-b border-gray-150 flex justify-between items-center">
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-150/70 rounded-full text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">add_circle</span>
                إضافة شريحة نظام جديدة
              </h3>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5">رقم الهاتف الشريحة</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-xs text-gray-400">phone</span>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="مثال: 777112233"
                    className="w-full pr-10 pl-10 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all font-mono"
                  />
                  <CameraCapture onCapture={() => {}} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5">رقم التسلسلي الأمني (ICCID)</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-xs text-gray-400">fingerprint</span>
                  <input
                    type="text"
                    required
                    value={formIccid}
                    onChange={(e) => setFormIccid(e.target.value)}
                    placeholder="89967000..."
                    className="w-full pr-10 pl-10 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all font-mono"
                  />
                  <CameraCapture onCapture={() => {}} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1.5">الشبكة المزودة</label>
                  <select
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs bg-white focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none cursor-pointer"
                  >
                    <option value="Yemen Mobile">يمن موبايل</option>
                    <option value="Sabafon">سبأفون</option>
                    <option value="YOU">يو</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1.5">باقة البداية المخصصة</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formPackage}
                      onChange={(e) => setFormPackage(e.target.value)}
                      className="w-full pl-10 px-3 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all"
                    />
                    <CameraCapture onCapture={() => {}} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5">المالك / الوكيل الموزع</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formOwner}
                    onChange={(e) => setFormOwner(e.target.value)}
                    className="w-full pl-10 px-3 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all"
                  />
                  <CameraCapture onCapture={() => {}} />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-55/70 rounded-xl text-xs font-bold transition-all hover:border-gray-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:brightness-110 shadow-md active:scale-[0.98] transition-all cursor-pointer"
                >
                  حفظ الشريحة بالمستودع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-right leading-relaxed animate-in fade-in zoom-in-95 duration-200 border border-gray-100/80">
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
              <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setShowImportModal(false); setCsvFile(null); setCsvPreview([]); }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-55/70 rounded-xl text-xs font-bold transition-all hover:border-gray-300 cursor-pointer"
                >
                  إلغاء التوريد
                </button>
                <button
                  type="submit"
                  disabled={csvPreview.length === 0 || csvImporting}
                  className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:brightness-110 shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {csvImporting ? 'جارٍ الاستيراد...' : `بدء استيراد ${csvPreview.length} شريحة`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
