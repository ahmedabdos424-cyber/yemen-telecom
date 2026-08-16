/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DuplicateIdentityRow } from '../../api/types';

export interface OperationLogItem {
  id: string;
  action: string;
  time: string;
  status: 'success' | 'failed' | 'warning';
  details: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'city' | 'checkpoint' | 'identity';
  color: string;
  size: number;
  risk: string;
  region?: string;
  idNo?: string;
  sims?: number;
  flagged?: boolean;
  blocked?: boolean;
  reviewStatus?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface SimLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
}

export interface SummaryStats {
  total: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  riskPct: number;
  underReview: number;
  underReviewPct: number;
  highBarPct: number;
  medBarPct: number;
  lowBarPct: number;
}

declare global {
  interface Window {
    zoomInGraph?: () => void;
    zoomOutGraph?: () => void;
    zoomResetGraph?: () => void;
    zoomRestartPhysics?: () => void;
  }
}

export function toOperationStatus(status: string): OperationLogItem['status'] {
  if (status === 'verified' || status === 'normal') return 'success';
  return 'warning';
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function identityCsvRows(rows: DuplicateIdentityRow[]): string[] {
  const header = ['رقم الهوية', 'الاسم', 'عدد الشرائح', 'عدد التكرارات', 'مستوى الخطورة', 'المنطقة', 'الحالة'];
  const body = rows.map((r) => [
    r.idNo, r.name, r.simsCount, r.duplicatesCount, r.risk, r.region,
    r.blocked ? 'محظور' : r.flagged ? 'مشتبه بها' : 'قيد المراقبة',
  ].join(','));
  return [header.join(','), ...body];
}

export function formatLastActivity(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' });
}