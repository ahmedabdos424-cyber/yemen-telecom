/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import OperatorLogo from '../shared/OperatorLogo';
import { statusLabel } from './simStatus';

interface SimFiltersBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedProvider: string;
  onProviderChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedOwner: string;
  onOwnerChange: (value: string) => void;
  selectedPackage: string;
  onPackageChange: (value: string) => void;
  uniqueOwners: string[];
  uniquePackages: string[];
  onClearAll: () => void;
}

export default function SimFiltersBar({
  searchTerm,
  onSearchChange,
  selectedProvider,
  onProviderChange,
  selectedStatus,
  onStatusChange,
  selectedOwner,
  onOwnerChange,
  selectedPackage,
  onPackageChange,
  uniqueOwners,
  uniquePackages,
  onClearAll,
}: SimFiltersBarProps) {
  const hasActiveFilters =
    searchTerm ||
    selectedProvider !== 'all' ||
    selectedStatus !== 'all' ||
    selectedOwner !== 'all' ||
    selectedPackage !== 'all';

  return (
    <div className="card p-3 md:p-4 space-y-2.5 md:space-y-3">
      <div className="flex flex-col md:flex-row gap-2.5 md:gap-3">
        <div className="input-group flex-1">
          <span className="material-symbols-outlined input-icon">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="البحث برقم الهاتف، الرقم التسلسلي ICCID، المالك أو باقة الشريحة..."
            className="input-field"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
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
              onClick={() => onProviderChange('all')}
              className={`min-h-[44px] px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-bold border-2 transition-all duration-200 flex items-center gap-1.5 md:gap-2 active:scale-[0.97] shrink-0 snap-start ${selectedProvider === 'all' ? 'bg-gray-800 text-white border-gray-600 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'}`}
            >
              <span className="material-symbols-outlined text-base md:text-lg">apps</span>
              الكل
            </button>
            <button
              type="button"
              onClick={() => onProviderChange('Yemen Mobile')}
              className={`min-h-[44px] px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-bold border-2 transition-all duration-200 flex items-center gap-1.5 md:gap-2 active:scale-[0.97] shrink-0 snap-start ${selectedProvider === 'Yemen Mobile' ? 'bg-op-ym border-op-ym shadow-lg text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-op-ym/60 hover:bg-op-ym-light'}`}
            >
              <OperatorLogo provider="Yemen Mobile" size="md" plain />
              <span>يمن موبايل</span>
            </button>
            <button
              type="button"
              onClick={() => onProviderChange('Sabafon')}
              className={`min-h-[44px] px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-bold border-2 transition-all duration-200 flex items-center gap-1.5 md:gap-2 active:scale-[0.97] shrink-0 snap-start ${selectedProvider === 'Sabafon' ? 'bg-op-sf border-op-sf shadow-lg text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-op-sf/60 hover:bg-op-sf-light'}`}
            >
              <OperatorLogo provider="Sabafon" size="md" plain />
              <span>سبأفون</span>
            </button>
            <button
              type="button"
              onClick={() => onProviderChange('YOU')}
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
            onChange={(e) => onStatusChange(e.target.value)}
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
            onChange={(e) => onOwnerChange(e.target.value)}
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
            onChange={(e) => onPackageChange(e.target.value)}
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
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 md:gap-2 pt-2 border-t border-gray-100 text-[10px] md:text-[11px]">
          <span className="text-gray-400 font-bold">نشط التصفية:</span>

          {searchTerm && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
              نص البحث: "{searchTerm}"
              <button type="button" onClick={() => onSearchChange('')} className="hover:text-amber-900 font-bold font-mono">✕</button>
            </span>
          )}
          {selectedProvider !== 'all' && (
            <span className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-full font-semibold ${
              selectedProvider === 'Yemen Mobile' ? 'bg-op-ym-light border-op-ym' :
              selectedProvider === 'Sabafon' ? 'bg-op-sf-light border-op-sf' :
              'bg-op-you-light border-op-you'
            }`}>
              الشبكة: {selectedProvider === 'Yemen Mobile' ? 'يمن موبايل' : selectedProvider === 'Sabafon' ? 'سبأفون' : 'يو'}
              <button type="button" onClick={() => onProviderChange('all')} className="font-bold font-mono">✕</button>
            </span>
          )}
          {selectedStatus !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-green-50 text-green-800 border border-green-200 px-2 py-0.5 rounded-full font-semibold">
              الحالة: {statusLabel(selectedStatus)}
              <button type="button" onClick={() => onStatusChange('all')} className="hover:text-green-950 font-bold font-mono">✕</button>
            </span>
          )}
          {selectedOwner !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-850 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
              المالك: {selectedOwner}
              <button type="button" onClick={() => onOwnerChange('all')} className="hover:text-purple-900 font-bold font-mono">✕</button>
            </span>
          )}
          {selectedPackage !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-850 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold">
              الباقة: {selectedPackage}
              <button type="button" onClick={() => onPackageChange('all')} className="hover:text-indigo-900 font-bold font-mono">✕</button>
            </span>
          )}

          <button
            type="button"
            onClick={onClearAll}
            className="text-secondary hover:underline mr-auto font-bold text-[11px]"
          >
            مسح تصفية الكل
          </button>
        </div>
      )}
    </div>
  );
}