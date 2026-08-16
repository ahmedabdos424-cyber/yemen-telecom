/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Agent } from '../../types';
import { safeString } from '../../lib/safe';

interface AgentCardProps {
  agent: Agent;
  searchTerm: string;
  onEdit: (agent: Agent) => void;
  onToggleStatus: (id: string, currentStatus: 'active' | 'inactive') => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, searchTerm, onEdit, onToggleStatus }) => {
  const highlightMatches = (text: string, search: string): React.ReactNode => {
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
          const isMatch = tokens.some((token) => part.toLowerCase() === token.toLowerCase());
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

  return (
    <div className="card overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Profile Card Header */}
      <div className="p-3 md:p-4 flex justify-between items-start border-b border-gray-100 bg-gray-50/10">
        <div className="flex gap-2.5 md:gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary-container text-white flex items-center justify-center text-xs md:text-sm font-bold shadow-sm shrink-0">
            {safeString(agent.name).split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join(' ')}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-[11px] md:text-xs text-gray-900 truncate">{highlightMatches(agent.name, searchTerm)}</h3>
            <p className="text-[10px] md:text-[11px] text-gray-500 font-semibold mt-0.5 md:mt-1 font-mono truncate">
              {highlightMatches(agent.region, searchTerm)} • ID: {highlightMatches(agent.phone, searchTerm)}
            </p>
          </div>
        </div>
        <span className={`badge shrink-0 mr-1 ${
          agent.status === 'active'
            ? 'badge-active'
            : 'badge-inactive'
        }`}>
          {agent.status === 'active' ? 'نشط' : 'غير نشط'}
        </span>
      </div>

      {/* Data numbers row */}
      <div className="grid grid-cols-2 p-3 md:p-4 bg-gray-50/50 gap-2.5 md:gap-4 border-b border-gray-100">
        <div className="flex flex-col">
          <span className="text-[10px] md:text-[11px] text-gray-400 font-bold">نقاط البيع</span>
          <span className="text-[11px] md:text-xs font-bold text-gray-955 mt-0.5 md:mt-1 font-mono">{(agent.sellersCount ?? 0)} بائع</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] md:text-[11px] text-gray-400 font-bold">مخزون الشرائح</span>
          <span className="text-[11px] md:text-xs font-bold text-gray-955 mt-0.5 md:mt-1 font-mono">{(agent.simsCount ?? 0).toLocaleString()} شريحة</span>
        </div>
      </div>

      {/* Grid actions */}
      <div className="grid grid-cols-3 sm:flex divide-x sm:divide-x-reverse divide-gray-100 bg-white">
        <a
          href={`tel:${agent.phone}`}
          className="btn btn-ghost btn-sm rounded-none sm:rounded-none"
        >
          <span className="material-symbols-outlined text-sm text-gray-500">call</span>
          <span className="hidden 2xs:inline">اتصال</span>
        </a>
        <button
          onClick={() => onEdit(agent)}
          className="btn btn-ghost btn-sm rounded-none sm:rounded-none"
        >
          <span className="material-symbols-outlined text-xs text-gray-500 font-bold">edit</span>
          <span className="hidden 2xs:inline">تعديل</span>
        </button>
        <button
          onClick={() => onToggleStatus(agent.id, agent.status)}
          className={`btn btn-sm rounded-none sm:rounded-none ${
            agent.status === 'active'
              ? 'text-secondary hover:bg-red-50/40'
              : 'text-green-700 hover:bg-green-50/45'
          }`}
        >
          <span className="material-symbols-outlined text-sm font-bold">
            {agent.status === 'active' ? 'block' : 'check_circle'}
          </span>
          <span className="hidden 2xs:inline">{agent.status === 'active' ? 'تعطيل' : 'تنشيط'}</span>
        </button>
      </div>
    </div>
  );
};

export default React.memo(AgentCard);
