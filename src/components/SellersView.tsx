/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Seller, SIM } from '../types';
import profileImage from '../assets/profile.png';
import { useToast, ToastContainer } from '../hooks/useToast';
import { api } from '../api/client';
import CameraCapture from './shared/CameraCapture';

interface SellersViewProps {
  sellers: Seller[];
  sims: SIM[];
  onUpdateSeller: (id: string, updated: Partial<Seller>) => void;
  onAddBalance: (sellerId: string, amount: number, invoiceImage?: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const EMPTY_SELLER: Seller = {
  id: '',
  name: '',
  phone: '',
  region: '',
  status: 'active',
  sales30Days: 0,
  salesGrowth: 0,
  simsCount: 0,
  activityRate: 0,
  storeName: '',
  idNumber: '',
  regionCode: '',
  totalSales: 0,
  currentStock: 0,
  efficiency: 0,
  creationDate: '',
  lastLogin: '',
};

function SellersView({ sellers = [], sims = [], onUpdateSeller, onAddBalance, loading, error, onRetry }: SellersViewProps) {
  const [selectedSellerId, setSelectedSellerId] = useState<string>('SLR-99021');
  const [activeTab, setActiveTab] = useState<'inventory' | 'customers' | 'transactions'>('inventory');
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState<number>(5000);

  const [invoiceImageUrl, setInvoiceImageUrl] = useState<string | null>(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  const { toasts, dismissToast, toastSuccess, toastError } = useToast();

  const handleInvoiceCapture = useCallback(async (imageData: string) => {
    setUploadingInvoice(true);
    try {
      const response = await fetch(imageData);
      const blob = await response.blob();
      const result = await api.uploadFile(blob, 'image');
      setInvoiceImageUrl(result.url);
      toastSuccess('تم رفع صورة فاتورة الشحن بنجاح وستُرفق مع العملية.');
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingInvoice(false);
    }
  }, [toastError, toastSuccess]);

  const selectedSeller = sellers.find((s) => s.id === selectedSellerId) || sellers[0] || EMPTY_SELLER;

  // Specific SIM items assigned to the selected seller (Ahmed has some specific keys in the mock data, or we filter sims currently owned by him)
  const sellerSIMs = useMemo(() => sims.filter(
    (sim) => (sim.owner ?? '').includes(selectedSeller.name) || (selectedSeller.id === 'SLR-99021' && sim.id !== '1' && sim.id !== '2' && sim.id !== '3')
  ), [sims, selectedSeller]);

  const toggleSellerStatus = useCallback((id: string, currentStatus: 'active' | 'inactive' | 'suspended' | 'low_stock') => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    onUpdateSeller(id, { status: newStatus });
  }, [onUpdateSeller]);

  const submitAddBalance = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onAddBalance(selectedSeller.id, balanceAmount, invoiceImageUrl || undefined);
    setShowAddBalanceModal(false);
    setInvoiceImageUrl(null);
    toastSuccess(`تم إضافة رصيد مبيعات بقيمة ${balanceAmount} ر.ي للبائع ${selectedSeller.name} بنجاح!`);
  }, [onAddBalance, selectedSeller.id, selectedSeller.name, balanceAmount, invoiceImageUrl]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-bold text-sm">جاري التحميل...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <span className="material-symbols-outlined text-4xl text-red-400">error_outline</span>
        <p className="text-gray-600 font-bold text-sm">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn btn-primary btn-sm">
            إعادة المحاولة
          </button>
        )}
      </div>
    );
  }

  if (sellers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <span className="material-symbols-outlined text-4xl text-gray-300">group_off</span>
        <p className="text-gray-500 font-bold text-sm">لا توجد بيانات</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* Seller Header Profile Card */}
      <section className="card flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="relative">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden shadow-md border-2 border-white relative">
              <img
                alt="SellerProfile"
                className="w-full h-full object-cover"
                src={profileImage}
              />
            </div>
            <span className={`absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border-4 border-white ${
              selectedSeller.status === 'active' ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
          </div>

          <div>
            <h2 className="font-headline-lg text-base md:text-lg text-gray-900 font-bold">{selectedSeller.name}</h2>
            <div className="flex flex-wrap gap-2 md:gap-3 mt-1 md:mt-1.5 text-[10px] md:text-xs text-gray-500 font-semibold">
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

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowAddBalanceModal(true)}
            className="flex-1 sm:flex-none btn btn-primary min-h-[40px] md:min-h-[48px]"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span className="hidden sm:inline">شحن وتعبئة رصيد البائع</span>
            <span className="sm:hidden">شحن رصيد</span>
          </button>
          <button
            onClick={() => toggleSellerStatus(selectedSeller.id, selectedSeller.status)}
            className={`flex-1 sm:flex-none btn btn-ghost min-h-[40px] md:min-h-[48px] ${
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
      <section className="bg-gray-100 rounded-xl p-1.5 md:p-2 flex gap-1.5 md:gap-2 overflow-x-auto scroll-smooth">
        {sellers.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSellerId(s.id)}
            className={`px-3 md:px-4 py-1.5 md:py-2 text-[11px] md:text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 md:gap-2 cursor-pointer ${
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
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-xl p-3 md:p-5 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-2 md:mb-3">
            <span className="text-gray-500 font-bold text-[10px] md:text-xs">إجمالي مبيعات البائع (30 يوم)</span>
            <span className="material-symbols-outlined text-blue-600 bg-blue-50 border border-blue-100 p-1 md:p-1.5 rounded-lg text-xs md:text-sm">payments</span>
          </div>
          <h4 className="text-lg md:text-2xl font-bold text-gray-900 font-mono">{(selectedSeller.sales30Days ?? 0).toLocaleString()}</h4>
          {selectedSeller.salesGrowth > 0 ? (
            <p className="text-green-600 font-bold text-[11px] mt-2 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[13px]">trending_up</span>
              +{(selectedSeller.salesGrowth ?? 0)}% عن الشهر السالف
            </p>
          ) : (
            <p className="text-gray-400 text-[11px] mt-2">لا يوجد نمو مسجل</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-3 md:p-5 border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-2 md:mb-3">
            <span className="text-gray-500 font-bold text-[10px] md:text-xs">المخزون الجاهز بعهدته</span>
            <span className="material-symbols-outlined text-orange-600 bg-orange-50 border border-orange-100 p-1 md:p-1.5 rounded-lg text-xs md:text-sm">inventory</span>
          </div>
          <h4 className="text-lg md:text-2xl font-bold text-gray-900 font-mono">{selectedSeller.simsCount}</h4>
          <p className="text-gray-400 text-[10px] md:text-[11px] mt-1 md:mt-2">شرائح SIM بجميع الشبكات</p>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-5 border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-2 md:mb-3">
            <span className="text-gray-500 font-bold text-[10px] md:text-xs">معدل نشاط الأجهزة والبيع</span>
            <span className="material-symbols-outlined text-green-650 bg-green-50 border border-green-100 p-1 md:p-1.5 rounded-lg text-xs md:text-sm">bolt</span>
          </div>
              <h4 className="text-lg md:text-2xl font-bold text-gray-900 font-mono">{selectedSeller.activityRate}%</h4>
          <p className={`text-[10px] md:text-[11px] font-bold mt-1 md:mt-2 ${selectedSeller.activityRate > 90 ? 'text-green-600' : 'text-gray-450'}`}>
            {selectedSeller.activityRate > 90 ? 'تقييم أمني وتشغيلي ممتاز' : 'مستقر'}
          </p>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-5 border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-2 md:mb-3">
            <span className="text-gray-500 font-bold text-[10px] md:text-xs">رابط الاتصال المسجل</span>
            <span className="material-symbols-outlined text-purple-600 bg-purple-50 border border-purple-100 p-1 md:p-1.5 rounded-lg text-xs md:text-sm">phone</span>
          </div>
          <h4 className="text-sm md:text-base font-bold text-gray-900 font-mono mt-0.5 md:mt-1">{selectedSeller.phone}</h4>
          <p className="text-gray-400 text-[10px] md:text-[11px] mt-1 md:mt-2">رقم الجوال لتوصيل إشعارات SMS</p>
        </div>
      </section>

      {/* Table Matrix View */}
      <section className="card overflow-hidden">
        {/* Tabs Control bar */}
        <div className="flex border-b border-gray-250 bg-gray-50/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 md:px-6 py-3 md:py-4 font-bold text-[11px] md:text-xs flex items-center gap-1 md:gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'inventory' ? 'text-secondary border-b-2 border-secondary font-bold bg-white' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className="material-symbols-outlined text-xs md:text-sm">inventory_2</span>
            مخزون الشرائح بعهدته ({sellerSIMs.length})
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 md:px-6 py-3 md:py-4 font-bold text-[11px] md:text-xs flex items-center gap-1 md:gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'customers' ? 'text-secondary border-b-2 border-secondary font-bold bg-white' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className="material-symbols-outlined text-xs md:text-sm">person</span>
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md overflow-hidden text-right leading-relaxed animate-in fade-in slide-in-from-bottom duration-200 sm:zoom-in-95 sm:duration-150">
            <div className="hidden sm:block bottom-sheet-drag mx-auto mb-2 mt-2" />
            <div className="px-4 md:px-5 py-3 md:py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <button onClick={() => setShowAddBalanceModal(false)} className="p-2.5 text-gray-400 hover:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
              <h3 className="font-bold text-sm text-gray-800">شحن رصيد لوكيل التوزيع</h3>
            </div>
            <form onSubmit={submitAddBalance} className="p-4 md:p-5 space-y-3 md:space-y-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
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
                    placeholder="مبلغ الشحن"
                    className="input-field with-icon-left"
                  />
                  <CameraCapture onCapture={handleInvoiceCapture} iconSize={14} />
                </div>
                {invoiceImageUrl && (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-150 rounded-lg">
                    <img src={invoiceImageUrl} alt="فاتورة الشحن" className="w-12 h-12 object-cover rounded" />
                    <span className="text-[11px] text-emerald-800 font-semibold flex-1">تم إرفاق صورة الفاتورة وستُحفظ مع العملية.</span>
                    <button type="button" onClick={() => setInvoiceImageUrl(null)} className="p-2.5 text-emerald-700 hover:text-emerald-900 min-w-[44px] min-h-[44px] flex items-center justify-center" title="إزالة">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                )}
                {uploadingInvoice && (
                  <p className="mt-2 text-[11px] text-blue-600 font-semibold">جارٍ رفع صورة الفاتورة...</p>
                )}
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


    </div>
  );
}

export default React.memo(SellersView);
