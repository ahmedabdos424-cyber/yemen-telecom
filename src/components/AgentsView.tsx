/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Agent, ViewType } from '../types';
import { safeArray, safeString } from '../lib/safe';

interface AgentsViewProps {
  agents: Agent[];
  setView: (view: ViewType) => void;
  onUpdateAgent: (id: string, updated: Partial<Agent>) => void;
}

function AgentsView({ agents = [], setView, onUpdateAgent }: AgentsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [minSimsFilter, setMinSimsFilter] = useState('all');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRegion, setEditRegion] = useState('');

  const openEditModal = (agent: Agent) => {
    setEditAgent(agent);
    setEditName(agent.name);
    setEditPhone(agent.phone);
    setEditRegion(agent.region);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAgent) return;
    onUpdateAgent(editAgent.id, { name: editName, phone: editPhone, region: editRegion });
    setEditAgent(null);
  };

  const filteredAgents = agents.filter((agent) => {
    // 1. Multi-token search matching across name, phone, region, status, id
    const searchTokens = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matchesSearch = searchTokens.length === 0 || searchTokens.every(token => 
      safeString(agent.name).toLowerCase().includes(token) || 
      safeString(agent.phone).toLowerCase().includes(token) || 
      safeString(agent.id).toLowerCase().includes(token) ||
      safeString(agent.region).toLowerCase().includes(token)
    );

    // 2. Select filters
    const matchesRegion = regionFilter === 'all' || safeString(agent.region).includes(regionFilter);
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    
    let matchesMinSims = true;
    if (minSimsFilter !== 'all') {
      const minVal = parseInt(minSimsFilter, 10);
      matchesMinSims = agent.simsCount >= minVal;
    }

    return matchesSearch && matchesRegion && matchesStatus && matchesMinSims;
  });

  // Text highlighting utility
  const highlightMatches = (text: string, search: string) => {
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
  };

  const stats = {
    total: agents.length,
    active: agents.filter((a) => a.status === 'active').length,
    salesToday: '45,200',
    pending: '12'
  };

  const toggleAgentStatus = (id: string, currentStatus: 'active' | 'inactive') => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    onUpdateAgent(id, { status: newStatus });
  };

  const handlePrintPDF = () => {
    const activeFilters = [];
    if (searchTerm) activeFilters.push(`مصفى بـ "${searchTerm}"`);
    if (regionFilter !== 'all') activeFilters.push(`المنطقة: ${regionFilter}`);
    if (statusFilter !== 'all') activeFilters.push(`الحالة: ${statusFilter === 'active' ? 'نشط' : 'غير نشط'}`);
    if (minSimsFilter !== 'all') activeFilters.push(`الحد الأدنى لمخزون الشرائح: ${minSimsFilter}`);

    const filterText = activeFilters.length > 0 ? activeFilters.join(' • ') : 'جميع الموزعين المعتمدين بالشبكة';

    const currentFormattedDate = new Date().toLocaleDateString('ar-YE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>تقرير الوكلاء المعتمدين - ${new Date().toLocaleDateString('ar-YE')}</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Tajawal', sans-serif;
            color: #0f172a;
            background-color: #ffffff;
            padding: 40px;
            font-size: 11px;
            line-height: 1.5;
          }
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px double #0284c7;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .header-right {
            text-align: right;
            line-height: 1.6;
          }
          .header-right h1 {
            font-size: 13px;
            font-weight: 800;
            color: #0369a1;
            margin-bottom: 3px;
          }
          .header-right p {
            font-size: 9px;
            color: #4b5563;
            font-weight: 500;
          }
          .header-left {
            text-align: left;
            line-height: 1.6;
          }
          .header-left .logo-placeholder {
            font-size: 16px;
            font-weight: 800;
            color: #e11d48;
            margin-bottom: 3px;
            font-family: 'JetBrains Mono', monospace;
          }
          .header-left p {
            font-size: 9px;
            color: #6b7280;
          }
          .document-title {
            text-align: center;
            margin-bottom: 20px;
          }
          .document-title h2 {
            font-size: 16px;
            font-weight: 800;
            color: #0d172a;
            border-bottom: 2px solid #e2e8f0;
            display: inline-block;
            padding-bottom: 6px;
          }
          .document-title p {
            font-size: 10px;
            color: #0284c7;
            font-weight: 700;
            margin-top: 5px;
          }
          .metadata-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 20px;
          }
          .metadata-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px dashed #e2e8f0;
            padding-bottom: 6px;
          }
          .metadata-item:last-child, .metadata-item:nth-last-child(2) {
            border-bottom: none;
            padding-bottom: 0;
          }
          .metadata-label {
            font-weight: 700;
            color: #475569;
          }
          .metadata-value {
            font-weight: 500;
            color: #0f172a;
          }
          .metadata-value.mono {
            font-family: 'JetBrains Mono', monospace;
          }
          .agent-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .agent-table th {
            background-color: #0f172a;
            color: #ffffff;
            font-weight: 700;
            text-align: right;
            padding: 8px 10px;
            font-size: 10px;
            border: 1px solid #0f172a;
          }
          .agent-table td {
            padding: 8px 10px;
            border: 1px solid #e2e8f0;
            color: #334155;
            vertical-align: middle;
          }
          .agent-table tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 9999px;
            font-size: 8px;
            font-weight: 700;
          }
          .status-active {
            background-color: #dcfce7;
            color: #15803d;
            border: 1px solid #bbf7d0;
          }
          .status-inactive {
            background-color: #fee2e2;
            color: #b91c1c;
            border: 1px solid #fecaca;
          }
          .mono-txt {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
          }
          .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            text-align: center;
            margin-top: 35px;
            page-break-inside: avoid;
          }
          .signature-box {
            border-top: 1px dashed #94a3b8;
            padding-top: 8px;
            font-weight: 700;
            color: #475569;
          }
          .signature-title {
            font-size: 10px;
            color: #64748b;
            margin-top: 3px;
            font-weight: 500;
          }
          .official-seal {
            width: 110px;
            height: 110px;
            border: 2px dashed #cbd5e1;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 15px auto 0;
            color: #94a3b8;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            page-break-inside: avoid;
          }
          .disclaimer {
            text-align: center;
            color: #94a3b8;
            font-size: 8px;
            margin-top: 30px;
            line-height: 1.4;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="header-right">
            <h1>الجمهورية اليمنية</h1>
            <p>وزارة الاتصالات وتقنية المعلومات</p>
            <p>المؤسسة العامة للاتصالات السلكية واللاسلكية</p>
            <p>الإدارة العامة لشؤون الوكلاء والرقابة والمبيعات</p>
          </div>
          <div class="header-left">
            <div class="logo-placeholder">YEMEN TELECOM</div>
            <p>تاريخ النظام الرئيسي: ${new Date().toLocaleDateString('en-GB')}</p>
            <p>مرجع السند: TELE/AGENTS-2026-${Math.floor(1000 + Math.random() * 9000)}</p>
          </div>
        </div>

        <div class="document-title">
          <h2>تقرير بيان شبكة الوكلاء والموزعين المعتمدين</h2>
          <p>سند معتمد ورسمي صادر عن النظام لمراجعة البيانات المشتركة</p>
        </div>

        <div class="metadata-grid">
          <div class="metadata-item">
            <span class="metadata-label">تاريخ استخراج التقرير:</span>
            <span class="metadata-value">${currentFormattedDate}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">المسؤول المستخرج للملف (المدير):</span>
            <span class="metadata-value mono-txt">admin@domain.com</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">نطاق فلترة البيانات النشطة:</span>
            <span class="metadata-value">${filterText}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">إجمالي قيود الوكلاء المصدرة حالياً:</span>
            <span class="metadata-value mono-txt">${filteredAgents.length} وكيل معتمد</span>
          </div>
        </div>

        <table class="agent-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">م</th>
              <th>اسم الوكيل المعتمد / الفرع</th>
              <th>رقم الهاتف المعرف (ID)</th>
              <th>المنطقة الجغرافية</th>
              <th style="text-align: center; width: 80px;">النقاط النشطة</th>
              <th style="text-align: center; width: 100px;">المخزون المتوفر</th>
              <th style="text-align: center; width: 90px;">حالة الاعتماد</th>
            </tr>
          </thead>
          <tbody>
            ${filteredAgents.map((agent, index) => `
              <tr>
                <td style="text-align: center;" class="mono-txt">${index + 1}</td>
                <td style="font-weight: 700; color: #0f172a;">${agent.name}</td>
                <td class="mono-txt">${agent.phone}</td>
                <td style="font-weight: 500;">${agent.region}</td>
                <td style="text-align: center;" class="mono-txt">${agent.sellersCount ?? 0}</td>
                <td style="text-align: center; font-weight: 700;" class="mono-txt">${(agent.simsCount ?? 0).toLocaleString()}</td>
                <td style="text-align: center;">
                  <span class="status-badge ${agent.status === 'active' ? 'status-active' : 'status-inactive'}">
                    ${agent.status === 'active' ? 'نشط وقائم' : 'معطل وموقف'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="signature-section">
          <div>
            <div class="signature-box">العميد المسؤول عن التدقيق والرقابة المالية</div>
            <div class="signature-title">إمضاء: _________________________</div>
          </div>
          <div>
            <div class="signature-box">مدير الإدارة العامة للمبيعات والشراكات</div>
            <div class="signature-title">إمضاء وختم المبيعات: _________________________</div>
          </div>
        </div>

        <div class="official-seal">
          الختم الرسمي للمؤسسة
        </div>

        <div class="disclaimer">
          هذا التقرير وثيقة سرية مخصصة للاستخدام الرسمي لمديري نظام الاتصالات والشركاء الموزعين. أي تلاعب بالبيانات الواردة يعرض فاعله للمسؤولية القانونية والملاحقة القضائية بموجب شروط مكافحة الاحتيال وتسييل الهويات المعمول بها محلياً.
        </div>
      </body>
      </html>
    `;

    // Create a robust hidden block printer
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.src = 'about:blank';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    const printTimer = setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      const cleanupTimer = setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 500);
      return () => clearTimeout(cleanupTimer);
    }, 400);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h2 className="font-headline-lg text-sm sm:text-lg md:text-xl font-bold text-gray-900">إدارة شبكة الوكلاء المعتمدين</h2>

        </div>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowPrintModal(true)}
            className="btn btn-ghost w-full sm:w-auto justify-center"
          >
            <span className="material-symbols-outlined text-sm text-red-600">picture_as_pdf</span>
            تصدير تقرير الوكلاء (PDF)
          </button>
          <button
            onClick={() => setView('add-agent')}
            className="btn btn-primary w-full sm:w-auto justify-center"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            إضافة وكيل نظام جديد
          </button>
        </div>
      </div>

      {/* Stats tiles */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
        <div className="card p-3 md:p-4 flex flex-col gap-1.5 md:gap-2">
          <span className="material-symbols-outlined text-gray-400 text-xl md:text-2xl">groups</span>
          <div>
            <p className="text-gray-400 font-bold text-[10px] md:text-[11px] uppercase">إجمالي الوكلاء</p>
            <h4 className="text-base md:text-lg font-bold text-gray-900 font-mono mt-0.5">{stats.total}</h4>
          </div>
        </div>

        <div className="card p-3 md:p-4 flex flex-col gap-1.5 md:gap-2">
          <span className="material-symbols-outlined text-green-500 text-xl md:text-2xl">check_circle</span>
          <div>
            <p className="text-gray-400 font-bold text-[10px] md:text-[11px] uppercase">الوكلاء النشطون</p>
            <h4 className="text-base md:text-lg font-bold text-green-600 font-mono mt-0.5">{stats.active}</h4>
          </div>
        </div>

        <div className="card p-3 md:p-4 flex flex-col gap-1.5 md:gap-2">
          <span className="material-symbols-outlined text-blue-500 text-xl md:text-2xl">trending_up</span>
          <div>
            <p className="text-gray-400 font-bold text-[10px] md:text-[11px] uppercase">المبيعات الإجمالية اليومية</p>
            <h4 className="text-base md:text-lg font-bold text-gray-900 font-mono mt-0.5">{stats.salesToday} <span className="text-[10px] md:text-[11px] font-normal text-gray-500">ر.ي</span></h4>
          </div>
        </div>

        <div className="card p-3 md:p-4 flex flex-col gap-1.5 md:gap-2">
          <span className="material-symbols-outlined text-secondary text-xl md:text-2xl">pending_actions</span>
          <div>
            <p className="text-gray-400 font-bold text-[10px] md:text-[11px] uppercase">طلبات شحن معلقة</p>
            <h4 className="text-base md:text-lg font-bold text-secondary font-mono mt-0.5">{stats.pending}</h4>
          </div>
        </div>
      </section>
      <section className="card p-3 md:p-4 space-y-2.5 md:space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5 md:gap-3">
          <div className="input-group flex-1">
            <span className="material-symbols-outlined input-icon">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن وكيل بالاسم، رقم الهاتف المسجل، أو المحافظة..."
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-2.5">
          <div>
            <label className="block text-[10px] md:text-[11px] text-gray-400 font-bold mb-1">تحديد المنطقة الموزعة</label>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100/75 text-gray-700 outline-none min-h-[44px]"
            >
              <option value="all">جميع المناطق</option>
              <option value="أمانة">أمانة العاصمة</option>
              <option value="عدن">عدن - كريتر</option>
              <option value="تعز">تعز - الحوبان</option>
              <option value="حضرموت">حضرموت</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] md:text-[11px] text-gray-400 font-bold mb-1">حالة الوكيل الجارية</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100/75 text-gray-700 outline-none min-h-[44px]"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] md:text-[11px] text-gray-400 font-bold mb-1">الحد الأدنى لمخزون الشرائح</label>
            <select
              value={minSimsFilter}
              onChange={(e) => setMinSimsFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100/75 text-gray-700 outline-none min-h-[44px]"
            >
              <option value="all">الكل (بدون حد)</option>
              <option value="100">أكثر من 100 شريحة</option>
              <option value="500">أكثر من 500 شريحة</option>
              <option value="3000">أكثر من 3000 شريحة</option>
              <option value="10000">أكثر من 10,000 شريحة</option>
            </select>
          </div>
        </div>

        {/* Active badge tags */}
        {(searchTerm || regionFilter !== 'all' || statusFilter !== 'all' || minSimsFilter !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-[11px]">
            <span className="text-gray-400 font-bold">نشط التصفية:</span>
            
            {searchTerm && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                نص البحث: "{searchTerm}"
                <button type="button" onClick={() => setSearchTerm('')} className="hover:text-amber-900 font-bold font-mono">✕</button>
              </span>
            )}
            {regionFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                المنطقة: {regionFilter}
                <button type="button" onClick={() => setRegionFilter('all')} className="hover:text-blue-900 font-bold font-mono">✕</button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-green-50 text-green-800 border border-green-200 px-2 py-0.5 rounded-full font-semibold">
                الحالة: {statusFilter === 'active' ? 'نشط' : 'غير نشط'}
                <button type="button" onClick={() => setStatusFilter('all')} className="hover:text-green-950 font-bold font-mono">✕</button>
              </span>
            )}
            {minSimsFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
                مخزون &gt;= {minSimsFilter}
                <button type="button" onClick={() => setMinSimsFilter('all')} className="hover:text-purple-900 font-bold font-mono">✕</button>
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setRegionFilter('all');
                setStatusFilter('all');
                setMinSimsFilter('all');
              }}
              className="text-secondary hover:underline mr-auto font-bold text-[11px]"
            >
              مسح تصفية الكل
            </button>
          </div>
        )}
      </section>

      {/* High-Contrast detailed Agent list */}
      <div className="space-y-3 md:space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-xs md:text-sm text-gray-800">قائمة الفروع والوكلاء الموزعين</h3>
          <span className="text-[11px] md:text-xs text-gray-500 font-semibold">{filteredAgents.length} وكيل مفضل مسجل</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="card overflow-hidden flex flex-col hover:shadow-md transition-shadow"
            >
              {/* Profile Card Header */}
              <div className="p-3 md:p-4 flex justify-between items-start border-b border-gray-100 bg-gray-50/10">
                <div className="flex gap-2.5 md:gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary-container text-white flex items-center justify-center text-xs md:text-sm font-bold shadow-sm shrink-0">
                    {safeString(agent.name).split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join(' ')}
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
                  onClick={() => openEditModal(agent)}
                  className="btn btn-ghost btn-sm rounded-none sm:rounded-none"
                >
                  <span className="material-symbols-outlined text-xs text-gray-500 font-bold">edit</span>
                  <span className="hidden 2xs:inline">تعديل</span>
                </button>
                <button
                  onClick={() => toggleAgentStatus(agent.id, agent.status)}
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
          ))}

          {filteredAgents.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-500 font-body-sm bg-white rounded-xl border border-gray-200">
              لا توجد فروع أو وكلاء يطابقون خيارات البحث الحالية.
            </div>
          )}
        </div>
      </div>

      {showPrintModal && (
        <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-xs z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col my-8 max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                <div>
                  <h3 className="font-bold text-sm">معاينة التقرير الرسمي لشبكة الوكلاء (PDF)</h3>
                  <p className="text-[11px] text-gray-400">يرجى مراجعة تفاصيل السند والبيانات المفلترة قبل إرسالها للطباعة أو التصدير.</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="p-2.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Content - Sheet Preview Area */}
            <div className="flex-1 p-6 bg-gray-100 overflow-y-auto min-h-[300px] flex justify-center">
              <div className="bg-white max-w-[210mm] w-full p-8 md:p-12 shadow-md border border-gray-200 text-[#0f172a] text-[11px] leading-relaxed relative flex flex-col justify-start rounded-xl">
                {/* Official Letterhead Header */}
                <div className="flex justify-between items-start border-b-2 border-double border-sky-600 pb-4 mb-6">
                  <div className="text-right space-y-1">
                    <h4 className="text-xs font-extrabold text-sky-800">الجمهورية اليمنية</h4>
                    <p className="text-[11px] text-gray-500 font-medium">وزارة الاتصالات وتقنية المعلومات</p>
                    <p className="text-[11px] text-gray-500 font-medium">المؤسسة العامة للاتصالات السلكية واللاسلكية</p>
                    <p className="text-[11px] text-gray-500 font-medium">الإدارة العامة لشؤون الوكلاء والرقابة والمبيعات</p>
                  </div>
                  <div className="text-left space-y-1">
                    <div className="text-xs font-bold text-red-600 font-mono">YEMEN TELECOM</div>
                    <p className="text-[8px] text-gray-400">تاريخ النظام: ${new Date().toLocaleDateString('en-GB')}</p>
                    <p className="text-[8px] text-gray-400 font-mono">المرجع: TELE/PREVIEW-${new Date().getFullYear()}-F</p>
                  </div>
                </div>

                {/* Doc Title */}
                <div className="text-center mb-6">
                  <h3 className="text-sm font-extrabold border-b border-gray-200 pb-1 inline-block">بيان شبكة الوكلاء والموزعين المعتمدين</h3>
                  <p className="text-[11px] text-sky-600 font-bold mt-1">سند معتمد ورسمي صادر بموجب الفلترة النشطة باللوحة</p>
                </div>

                {/* Filter and metadata block */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-4 border border-gray-200 rounded-lg mb-6 text-[11px]">
                  <div className="flex justify-between border-b border-dashed border-gray-200 pb-1.5 md:border-none md:pb-0">
                    <span className="font-bold text-gray-550">تاريخ الاستخراج:</span>
                    <span className="font-semibold">{new Date().toLocaleDateString('en-GB')}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-gray-200 pb-1.5 md:border-none md:pb-0">
                    <span className="font-bold text-gray-550">المستخدم المستخرِج:</span>
                    <span className="font-semibold font-mono">admin@domain.com</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-gray-250 pb-1.5 md:border-none md:pb-0">
                    <span className="font-bold text-gray-550">مستوى الفلترة النشط:</span>
                    <span className="font-semibold text-sky-800">
                      {searchTerm ? `نص: "${searchTerm}"` : ''} 
                      {regionFilter !== 'all' ? ` | منطقة: ${regionFilter}` : ''}
                      {statusFilter !== 'all' ? ` | حالة: ${statusFilter === 'active' ? 'نشط' : 'غير نشط'}` : ''}
                      {!searchTerm && regionFilter === 'all' && statusFilter === 'all' ? 'جميع الوكلاء المسجلين' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-550">إجمالي السجلات:</span>
                    <span className="font-bold text-red-650 font-mono">{filteredAgents.length} جهة تفويضية</span>
                  </div>
                </div>

                {/* Core Registry Table */}
                <div className="table-wrap mb-6">
                  <table className="w-full text-right border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-gray-800 text-white border border-gray-800">
                        <th className="p-2 text-center w-8">م</th>
                        <th className="p-2">الوكيل / فرع التوزيع الرئيسي</th>
                        <th className="p-2">رقم المعرف / الهاتف</th>
                        <th className="p-2">المنطقة التابعة</th>
                        <th className="p-2 text-center">النقاط</th>
                        <th className="p-2 text-center">مخزون الشرائح</th>
                        <th className="p-2 text-center w-20">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredAgents.map((agent, i) => (
                        <tr key={agent.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="p-2 text-center font-mono font-semibold">{i + 1}</td>
                          <td className="p-2 font-bold text-gray-900">{agent.name}</td>
                          <td className="p-2 font-mono text-gray-650">{agent.phone}</td>
                          <td className="p-2 font-semibold text-gray-700">{agent.region}</td>
                          <td className="p-2 text-center font-mono">{agent.sellersCount ?? 0}</td>
                          <td className="p-2 text-center font-bold font-mono text-gray-800">{(agent.simsCount ?? 0).toLocaleString()}</td>
                          <td className="p-2 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded-full text-[8.5px] font-bold ${
                              agent.status === 'active' 
                                ? 'bg-green-100 text-green-700 border border-green-200' 
                                : 'bg-red-100 text-red-650 border border-red-200'
                            }`}>
                              {agent.status === 'active' ? 'نشط' : 'غير نشط'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredAgents.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-gray-400 font-medium">لا توجد سجلات مطابقة حالياً لعرضها.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Signature box */}
                <div className="grid grid-cols-2 gap-4 text-center mt-6 border-t border-dashed border-gray-200 pt-6">
                  <div>
                    <p className="font-bold text-gray-700 text-[10.5px]">دائرة الرقابة المالية ومكافحة التسييل والولوج</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">التوقيع والاعتماد:</p>
                    <p className="text-[11px] text-gray-300 mt-4">_________________________</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-700 text-[10.5px]">إدارة العمليات والشركاء الرسميين للاتصالات</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">التوقيع والختم المعتمد:</p>
                    <p className="text-[11px] text-gray-300 mt-4">_________________________</p>
                  </div>
                </div>

                {/* Bottom Disclaimer */}
                <p className="text-center text-[7.5px] text-gray-400 mt-8">
                  هذه صفحة لمعاينة مسودة التقرير الرسمي من النظام الداخلي قبل الطباعة. الضغط على زر الاعتماد المرفق بالأسفل سيقوم بحزم البيانات وتحفيظها بملف PDF المهيأ للمشاركة عبر قنوات العمل الرسمية.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-gray-100 shrink-0">
              <span className="text-[11px] text-gray-500 font-semibold text-center sm:text-right">
                ⚠️ يرجى استخدام متصفح يدعم ميزة "حفظ بتنسيق PDF" عند تفعيل خيارات الطباعة لتسجيل النسخة.
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="btn btn-ghost btn-sm flex-1 sm:flex-none"
                >
                  إغلاق وتراجع
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePrintPDF();
                    setShowPrintModal(false);
                  }}
                  disabled={filteredAgents.length === 0}
                  className="btn btn-primary flex-1 sm:flex-none"
                >
                  <span className="material-symbols-outlined text-sm font-bold">picture_as_pdf</span>
                  اعتماد وطباعة التقرير (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Edit Modal */}
      {editAgent && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-right leading-relaxed animate-in fade-in zoom-in-95 duration-200 border border-gray-100/80">
            <div className="px-6 py-4.5 bg-gray-50 border-b border-gray-150 flex justify-between items-center">
              <button onClick={() => setEditAgent(null)} className="p-2 hover:bg-gray-150/70 rounded-full text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">edit</span>
                تعديل بيانات الوكيل
              </h3>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5">اسم الوكيل</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all"
                />
              </div>
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
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5">المنطقة</label>
                <input
                  type="text"
                  required
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/55 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditAgent(null)}
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
    </div>
  );
}

export default React.memo(AgentsView);
