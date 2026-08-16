/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { SIM } from '../../types';
import { Upload } from 'lucide-react';

interface SimCsvImportModalProps {
  onClose: () => void;
  onImport: (records: Partial<SIM>[]) => void;
}

export default function SimCsvImportModal({ onClose, onImport }: SimCsvImportModalProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<Partial<SIM>[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const csvFileRef = useRef<HTMLInputElement>(null);

  const handleCSVFileChange = (e: ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleImportCSV = (e: FormEvent) => {
    e.preventDefault();
    if (csvPreview.length === 0) return;
    setCsvImporting(true);
    onImport(csvPreview);
    setCsvImporting(false);
    setCsvFile(null);
    setCsvPreview([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm md:max-w-md overflow-hidden text-right leading-relaxed animate-in fade-in zoom-in-95 duration-200 border border-gray-100/80">
        <div className="px-6 py-4.5 bg-gray-50 border-b border-gray-150 flex justify-between items-center">
          <button onClick={onClose} className="p-2 hover:bg-gray-150/70 rounded-full text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
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
              onClick={() => { onClose(); setCsvFile(null); setCsvPreview([]); }}
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
  );
}