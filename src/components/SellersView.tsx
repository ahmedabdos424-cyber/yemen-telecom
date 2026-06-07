/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Seller, SIM } from '../types';
import { Check } from 'lucide-react';

interface SellersViewProps {
  sellers: Seller[];
  sims: SIM[];
  onUpdateSeller: (id: string, updated: Partial<Seller>) => void;
  onAddBalance: (sellerId: string, amount: number) => void;
}

export default function SellersView({ sellers, sims, onUpdateSeller, onAddBalance }: SellersViewProps) {
  const [selectedSellerId, setSelectedSellerId] = useState<string>('SLR-99021');
  const [activeTab, setActiveTab] = useState<'inventory' | 'customers' | 'transactions'>('inventory');
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState<number>(5000);

  // Camera capture with preview for invoice photo
  const [showCam, setShowCam] = useState(false);
  const [camPreview, setCamPreview] = useState<string | null>(null);
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const camVideoRef = useRef<HTMLVideoElement>(null);
  const camCanvasRef = useRef<HTMLCanvasElement>(null);
  const camFileRef = useRef<HTMLInputElement>(null);

  const openInvoiceCam = useCallback(async () => {
    setShowCam(true);
    setCamPreview(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCamStream(s);
      if (camVideoRef.current) {
        camVideoRef.current.srcObject = s;
        camVideoRef.current.play();
      }
    } catch {
      camFileRef.current?.click();
      setShowCam(false);
    }
  }, []);

  const captureInvoiceFrame = useCallback(() => {
    if (camVideoRef.current && camCanvasRef.current) {
      const v = camVideoRef.current;
      const c = camCanvasRef.current;
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext('2d')?.drawImage(v, 0, 0);
      setCamPreview(c.toDataURL('image/jpeg', 0.8));
    }
    if (camStream) {
      camStream.getTracks().forEach(t => t.stop());
      setCamStream(null);
    }
  }, [camStream]);

  const confirmInvoiceCapture = useCallback(() => {
    setCamPreview(null);
    setShowCam(false);
  }, []);

  const closeInvoiceCam = useCallback(() => {
    if (camStream) {
      camStream.getTracks().forEach(t => t.stop());
      setCamStream(null);
    }
    setCamPreview(null);
    setShowCam(false);
  }, [camStream]);

  const selectedSeller = sellers.find((s) => s.id === selectedSellerId) || sellers[0];

  // Specific SIM items assigned to the selected seller (Ahmed has some specific keys in the mock data, or we filter sims currently owned by him)
  const sellerSIMs = useMemo(() => sims.filter(
    (sim) => sim.owner.includes(selectedSeller.name) || (selectedSeller.id === 'SLR-99021' && sim.id !== '1' && sim.id !== '2' && sim.id !== '3')
  ), [sims, selectedSeller]);

  const toggleSellerStatus = (id: string, currentStatus: 'active' | 'inactive' | 'suspended' | 'low_stock') => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    onUpdateSeller(id, { status: newStatus });
  };

  const submitAddBalance = (e: React.FormEvent) => {
    e.preventDefault();
    onAddBalance(selectedSeller.id, balanceAmount);
    setShowAddBalanceModal(false);
    alert(`تم إضافة رصيد مبيعات بقيمة ${balanceAmount} ر.ي للبائع ${selectedSeller.name} بنجاح!`);
  };

  return (
    <div className="space-y-6">
      {/* Seller Header Profile Card */}
      <section className="card flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md border-2 border-white relative">
              <img
                alt="SellerProfile"
                className="w-full h-full object-cover"
                src={
                  selectedSeller.id === 'SLR-99021'
                    ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzb7HIWuKPm5_eNDtGimQyNmb3F8g1f_UXCXmOPvAW7gee3u-RWNYTYLfzbS6HMig6JCeHsaQMvFVoKGRuryQs_81dEc9DGiDgRsjfuOq_ZMiRz2ZLWUSN0Jd8P0zkrVsr5lCHd7p48EfEGhjPsKW7Aj9K399biHM3Jm6IhWf-CqmOZQGDrsIroIzUbD9U-u739y5aqrryT7k9Co7EABGPfgO0gnLym9QmlZJdJXfVkv69NDeeezCjfU8PUrdyIByPQ6mCgxD_4BY'
                    : selectedSeller.id === 'SLR-88124'
                    ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuDdoO1MxOooEPIMIX6a5jpY8AuUraH88xqfhwb2WMSZKVbsfKRZSgqASOR8WsVlGc3TaQ18FC0fVhLRjxvg3kh1WV7Hfo9ZZi1vbi2xMVmUN3-MkhWgbNeNeiEnqQ1-ubxT_z6VC4QyIqlhgPhq0aTBHpOgTT2evTZtExddZOf2bAHehRkLOWISPXwbKewQUJfaTdDd2Ee7_g-v6ZlwYUvrGuDOa4Nbl2pqzCIH0CBLNN8U78JLoIICUwUb5JsOX-qH9NghPeZEhzQ'
                    : 'https://lh3.googleusercontent.com/aida-public/AB6AXuCskPTg0PPt134f9p13mCzkurWQRaKjB9oG-ODRUL4yGslUGe3gc49dgWXjadKNc1GhkThpYh_UR2ce30F9FPF0BANll_oXB7ibrsezX6gFA2mKnWZrNzjAkY4Rs_7VSgASqoMJRtnHsAvdKh7xbpzvqwKVoxQXnk61yDBkwzrzyHlH0at8UxveZxpdpx4iw8h3PD9RbA_cqCknn4G82OG5pzF6X--okNJDoBUvo4wU8UyqVtxhc_XGOCHM6ExxQYvEPgdhW_qKmPM'
                }
              />
            </div>
            <span className={`absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border-4 border-white ${
              selectedSeller.status === 'active' ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
          </div>

          <div>
            <h2 className="font-headline-lg text-lg text-gray-900 font-bold">{selectedSeller.name}</h2>
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500 font-semibold">
              <span className="flex items-center gap-1 font-mono">
                <span className="material-symbols-outlined text-[15px]">fingerprint</span>
                معرف البائع: {selectedSeller.id}
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">apartment</span>
                المنطقة: {selectedSeller.region}
              </span>
              <span className={`badge ${
                selectedSeller.status === 'active' ? 'badge-active' : 'badge-suspended'
              }`}>
                {selectedSeller.status === 'active' ? 'نشط' : 'موقوف'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowAddBalanceModal(true)}
            className="flex-1 md:flex-none btn btn-primary"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            شحن وتعبئة رصيد البائع
          </button>
          <button
            onClick={() => toggleSellerStatus(selectedSeller.id, selectedSeller.status)}
            className={`flex-1 md:flex-none btn btn-ghost ${
              selectedSeller.status === 'active'
                ? 'border-red-200 text-secondary hover:bg-red-50'
                : 'border-green-200 text-green-700 hover:bg-green-50'
            }`}
          >
            {selectedSeller.status === 'active' ? 'تعليق البائع' : 'تفعيل الحساب'}
          </button>
        </div>
      </section>

      {/* Sellers switching quick Selector view */}
      <section className="bg-gray-100 rounded-xl p-2 flex gap-2 overflow-x-auto">
        {sellers.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSellerId(s.id)}
            className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              selectedSellerId === s.id
                ? 'bg-white shadow-sm text-gray-900 border border-gray-200/80'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {s.name}
          </button>
        ))}
      </section>

      {/* Stats Cards Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-500 font-bold text-xs">إجمالي مبيعات البائع (30 يوم)</span>
            <span className="material-symbols-outlined text-blue-600 bg-blue-50 border border-blue-100 p-1.5 rounded-lg text-sm">payments</span>
          </div>
          <h4 className="text-2xl font-bold text-gray-900 font-mono">{selectedSeller.sales30Days.toLocaleString()}</h4>
          {selectedSeller.salesGrowth > 0 ? (
            <p className="text-green-600 font-bold text-[11px] mt-2 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[13px]">trending_up</span>
              +{selectedSeller.salesGrowth}% عن الشهر السالف
            </p>
          ) : (
            <p className="text-gray-400 text-[11px] mt-2">لا يوجد نمو مسجل</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-500 font-bold text-xs">المخزون الجاهز بعهدته</span>
            <span className="material-symbols-outlined text-orange-600 bg-orange-50 border border-orange-100 p-1.5 rounded-lg text-sm">inventory</span>
          </div>
          <h4 className="text-2xl font-bold text-gray-900 font-mono">{selectedSeller.simsCount}</h4>
          <p className="text-gray-400 text-[11px] mt-2">شرائح SIM بجميع الشبكات</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-500 font-bold text-xs">معدل نشاط الأجهزة والبيع</span>
            <span className="material-symbols-outlined text-green-650 bg-green-50 border border-green-100 p-1.5 rounded-lg text-sm">bolt</span>
          </div>
              <h4 className="text-2xl font-bold text-gray-900 font-mono">{selectedSeller.activityRate}%</h4>
          <p className={`text-[11px] font-bold mt-2 ${selectedSeller.activityRate > 90 ? 'text-green-600' : 'text-gray-450'}`}>
            {selectedSeller.activityRate > 90 ? 'تقييم أمني وتشغيلي ممتاز' : 'مستقر'}
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-500 font-bold text-xs">رابط الاتصال المسجل</span>
            <span className="material-symbols-outlined text-purple-600 bg-purple-50 border border-purple-100 p-1.5 rounded-lg text-sm">phone</span>
          </div>
          <h4 className="text-base font-bold text-gray-900 font-mono mt-1">{selectedSeller.phone}</h4>
          <p className="text-gray-400 text-[11px] mt-2">رقم الجوال لتوصيل إشعارات SMS</p>
        </div>
      </section>

      {/* Table Matrix View */}
      <section className="card overflow-hidden">
        {/* Tabs Control bar */}
        <div className="flex border-b border-gray-250 bg-gray-50/50">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-6 py-4 font-bold text-xs flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'inventory' ? 'text-secondary border-b-2 border-secondary font-bold bg-white' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            مخزون الشرائح بعهدته ({sellerSIMs.length})
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-6 py-4 font-bold text-xs flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'customers' ? 'text-secondary border-b-2 border-secondary font-bold bg-white' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className="material-symbols-outlined text-sm">person</span>
            سجل العملاء التابعين له
          </button>
        </div>

        {/* Tab content screens */}
        {activeTab === 'inventory' ? (
          <div className="table-wrap">
            <table className="table-cards-mobile w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-3 md:px-6 py-3 font-bold text-gray-700 text-[11px]">رقم الهاتف</th>
                  <th className="px-3 md:px-6 py-3 font-bold text-gray-700 text-[11px] hidden md:table-cell">الرقم التسلسلي (ICCID)</th>
                  <th className="px-3 md:px-6 py-3 font-bold text-gray-700 text-[11px] hidden sm:table-cell">نوع الباقة</th>
                  <th className="px-3 md:px-6 py-3 font-bold text-gray-700 text-[11px] hidden lg:table-cell">تاريخ الإيداع</th>
                  <th className="px-3 md:px-6 py-3 font-bold text-gray-700 text-[11px]">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {sellerSIMs.map((sim) => (
                  <tr key={sim.id} className="hover:bg-gray-50 transition-colors content-visibility-auto">
                    <td data-label="رقم الهاتف" className="px-3 md:px-6 py-3 md:py-4 font-bold text-gray-900 text-[11px]">{sim.phone}</td>
                    <td data-label="الرقم التسلسلي (ICCID)" className="px-3 md:px-6 py-3 md:py-4 text-gray-500 text-[11px] hidden md:table-cell">{sim.iccid}</td>
                    <td data-label="نوع الباقة" className="px-3 md:px-6 py-3 md:py-4 font-sans font-semibold text-gray-800 text-[11px] hidden sm:table-cell">{sim.packageType}</td>
                    <td data-label="تاريخ الإيداع" className="px-3 md:px-6 py-3 md:py-4 font-sans text-gray-550 text-[11px] hidden lg:table-cell">{sim.dateAdded}</td>
                    <td data-label="الحالة" className="px-3 md:px-6 py-3 md:py-4">
                      <span className={`badge ${
                        sim.status === 'available'
                          ? 'badge-available'
                          : sim.status === 'reserved'
                          ? 'badge-reserved'
                          : 'badge-inactive'
                      }`}>
                        {sim.status === 'available' ? 'جاهزة للتوزيع' : sim.status === 'reserved' ? 'محجوزة' : 'تالفة'}
                      </span>
                    </td>
                  </tr>
                ))}
                {sellerSIMs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500 font-sans">
                      لا توجد عهدة شرائح مسجلة للبائع {selectedSeller.name} حالياً في النظام.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500 text-xs py-10 space-y-2">
            <span className="material-symbols-outlined text-3xl text-gray-400">group_off</span>
            <p className="font-bold">سجلات العملاء التفصيلية</p>
            <p className="text-gray-400">تخضع هذه البيانات لبروتوكولات الخصوصية وتتطلب تصريح أمان من مسؤول العقدة الرئيسي.</p>
          </div>
        )}
      </section>

      {/* Add Balance Modal Dialog Box */}
      {showAddBalanceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden text-right leading-relaxed animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <button onClick={() => setShowAddBalanceModal(false)} className="text-gray-400 hover:text-gray-700">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
              <h3 className="font-bold text-sm text-gray-800">شحن رصيد لوكيل التوزيع</h3>
            </div>
            <form onSubmit={submitAddBalance} className="p-5 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-150 rounded-lg text-xs leading-relaxed text-blue-900">
                أنت على وشك شحن رصيد بيع فوري لـ <strong>{selectedSeller.name}</strong>. يمنح هذا الرصيد القدرة للبائع لتفعيل الباقات مباشرة للزبائن.
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">مبلغ الشحن (ر.ي)</label>
                <div className="input-group">
                  <input
                    type="number"
                    required
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(Number(e.target.value))}
                    placeholder="مثال: 10000"
                    className="input-field with-icon-left"
                  />
                  <button type="button" onClick={openInvoiceCam} className="input-camera-btn" title="تصوير الفاتورة">
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                  </button>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddBalanceModal(false)}
                  className="btn btn-ghost btn-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  تأكيد وإضافة الرصيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden camera elements */}
      <video ref={camVideoRef} autoPlay playsInline className="hidden" />
      <canvas ref={camCanvasRef} className="hidden" />
      <input ref={camFileRef} type="file" accept="image/*" capture="environment" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const r = new FileReader();
          r.onload = (ev) => setCamPreview(ev.target?.result as string);
          r.readAsDataURL(file);
        }
      }} className="hidden" />

      {/* Camera live viewfinder */}
      {showCam && !camPreview && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">
            <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
              <video ref={camVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-[3px] border-dashed border-red-400/40 m-8 rounded-2xl pointer-events-none" />
            </div>
            <div className="flex gap-3 p-4 bg-gray-50">
              <button
                type="button"
                onClick={captureInvoiceFrame}
                className="btn btn-sm flex-1 bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">photo_camera</span>
                التقاط الصورة
              </button>
              <button
                type="button"
                onClick={closeInvoiceCam}
                className="btn btn-sm flex-1 bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera preview confirm/retake */}
      {showCam && camPreview && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">
            <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
              <img src={camPreview} alt="المعاينة" className="w-full h-full object-contain" />
              <div className="absolute top-3 right-3 bg-emerald-500/20 border border-emerald-400/30 text-emerald-600 text-[10px] px-2.5 py-1 rounded-full font-bold">
                معاينة
              </div>
            </div>
            <div className="flex gap-3 p-4 bg-gray-50">
              <button
                type="button"
                onClick={confirmInvoiceCapture}
                className="btn btn-sm flex-1 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2"
              >
                <Check size={16} />
                موافق
              </button>
              <button
                type="button"
                onClick={() => { setCamPreview(null); openInvoiceCam(); }}
                className="btn btn-sm flex-1 bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                إعادة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
