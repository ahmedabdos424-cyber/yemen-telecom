/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface ReportFieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

export function ReportField({ label, value, mono = false }: ReportFieldProps) {
  return (
    <div className="bg-gray-50 rounded-lg px-2.5 py-2">
      <p className="text-[9px] font-bold text-gray-400 mb-0.5">{label}</p>
      <p className={`text-[11px] font-bold text-gray-800 break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
