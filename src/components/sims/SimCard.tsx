/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SIM } from '../../types';
import OperatorLogo from '../shared/OperatorLogo';
import { statusBadgeClass, statusLabel } from './simStatus';

interface SimCardProps {
  sim: SIM;
  searchTerm: string;
  onView: (sim: SIM) => void;
  onEdit: (sim: SIM) => void;
}

function highlightMatches(text: string, search: string) {
  if (!text) return '';
  if (!search.trim()) return <span>{text}</span>;

  const cleanSearch = search.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const tokens = cleanSearch.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <span>{text}</span>;

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
}

export default function SimCard({ sim, searchTerm, onView, onEdit }: SimCardProps) {
  return (
    <div
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
            onClick={() => onView(sim)}
            className="touch-target p-2.5 md:p-3 text-gray-600 hover:text-secondary bg-gray-100 rounded-xl transition-colors border border-gray-200 cursor-pointer"
            title="عرض التفاصيل"
          >
            <span className="material-symbols-outlined text-base md:text-lg">visibility</span>
          </button>
          <button
            type="button"
            onClick={() => onEdit(sim)}
            className="touch-target p-2.5 md:p-3 text-gray-600 hover:text-secondary bg-gray-100 rounded-xl transition-colors border border-gray-200 cursor-pointer"
            title="تعديل الشريحة"
          >
            <span className="material-symbols-outlined text-base md:text-lg">edit_note</span>
          </button>
        </div>
      </div>
    </div>
  );
}