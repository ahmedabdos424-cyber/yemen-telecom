import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Seller, Sim, OperatorInventory, Operator, Role } from '../types';
import { Search, MapPin, Check, Plus, RefreshCw, X, SlidersHorizontal, Edit2, Play, AlertTriangle, Eye, Send, ArrowLeft, Trash2 } from 'lucide-react';

interface AgentDashboardProps {
  role: Role;
  sellers: Seller[];
  sims: Sim[];
  inventories: OperatorInventory[];
  onAddSeller: () => void; // Redirects active tab to 'add_seller'
  onTransferSims: (operator: Operator, count: number, startSerial: string, endSerial: string, recipientName: string) => void;
  onUpdateSellerStatus: (sellerId: string, status: 'active' | 'inactive') => void;
  onResetSellerPassword: (sellerId: string) => void;
}

export default function AgentDashboard({
  role,
  sellers,
  sims,
  inventories,
  onAddSeller,
  onTransferSims,
  onUpdateSellerStatus,
  onResetSellerPassword
}: AgentDashboardProps) {
  // State for search and filter controls
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'sold'>('all');
  const [operatorFilter, setOperatorFilter] = useState<Operator | 'all'>('all');
  
  // Modals state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [sellerActionsOpen, setSellerActionsOpen] = useState(false);
  const [sellerDetailsOpen, setSellerDetailsOpen] = useState(false);

  // Transfer Sim form state
  const [transferOp, setTransferOp] = useState<Operator>('yemen_mobile');
  const [startRange, setStartRange] = useState('');
  const [endRange, setEndRange] = useState('');
  const [targetSellerId, setTargetSellerId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Auto-calculated quantity for transfer
  const calculatedQty = useMemo(() => {
    const startNum = parseInt(startRange, 10);
    const endNum = parseInt(endRange, 10);
    if (!isNaN(startNum) && !isNaN(endNum) && endNum >= startNum) {
      return endNum - startNum + 1;
    }
    return 0;
  }, [startRange, endRange]);

  // Filtered SIM card inventory list
  const filteredSims = useMemo(() => {
    return sims.filter(sim => {
      const matchSearch = sim.iccid.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sim.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || 
                          (statusFilter === 'available' && sim.status === 'available') || 
                          (statusFilter === 'sold' && sim.status === 'sold');
      const matchOp = operatorFilter === 'all' || sim.operator === operatorFilter;
      return matchSearch && matchStatus && matchOp;
    });
  }, [sims, searchQuery, statusFilter, operatorFilter]);

  // Handle simulated range transfer
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!transferOp) return alert('الرجاء اختيار شركة الاتصالات');
    if (!startRange || !endRange) return alert('الرجاء إدخال نطاق الأرقام التسلسلية');
    if (calculatedQty <= 0) return alert('الرجاء التأكد من صحة النطاق المدخل');
    if (!targetSellerId) return alert('الرجاء تحديد البائع المستلم');

    const recipient = sellers.find(s => s.id === targetSellerId);
    if (!recipient) return;

    setIsTransferring(true);
    setTimeout(() => {
      setIsTransferring(false);
      onTransferSims(transferOp, calculatedQty, startRange, endRange, recipient.name);
      
      // Reset Form and close modal
      setStartRange('');
      setEndRange('');
      setTargetSellerId('');
      setTransferModalOpen(false);

      alert(`تم تحويل عدد ${calculatedQty} شريحة بنجاح إلى البائع ${recipient.name}.`);
    }, 1500);
  };

  const handleOpenTransferWithSeller = (seller: Seller) => {
    setTargetSellerId(seller.id);
    setTransferOp('yemen_mobile');
    setTransferModalOpen(true);
  };

  const handleResetPasswordClick = (seller: Seller) => {
    onResetSellerPassword(seller.id);
    setSellerActionsOpen(false);
  };

  const handleToggleStatusClick = (seller: Seller) => {
    const newStatus = seller.status === 'inactive' ? 'active' : 'inactive';
    onUpdateSellerStatus(seller.id, newStatus);
    setSellerActionsOpen(false);
  };

  return (
    <div className="space-y-8 font-sans pb-16">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {role === 'manager' ? 'بوابة الرقابة والتحكم للمدير العام' : 'إدارة مبیعات الوكيل'}
          </h1>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            {role === 'manager' 
              ? 'صلاحية الرقابة الشاملة والتدقيق لمخزون الوكلاء ومراجعة كفاءة بائعي التجزئة وإصدار التوجيهات' 
              : 'متابعة البائعين التابعين لنطاقك الإقليمي، وإجراء عمليات تحويل الشرائح ونطاقات السيريال'}
          </p>
        </div>
        <button
          onClick={onAddSeller}
          className={`${role === 'manager' ? 'bg-red-700 hover:bg-red-600' : 'bg-red-650 hover:bg-red-500'} text-white px-5 py-3 rounded-xl flex items-center gap-2 font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer`}
        >
          <Plus size={16} />
          <span>{role === 'manager' ? 'إنشاء حساب مستخدم/بائع جديد' : 'إضافة بائع جديد'}</span>
        </button>
      </div>

      {/* 2. Top Banner Alert Mockup (Goal / Action requirement) */}
      {role === 'manager' ? (
        <div className="bg-gradient-to-r from-red-950/30 to-slate-900 border-r-4 border-red-500 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group">
          <div className="relative z-10 max-w-xl">
            <span className="bg-red-650/20 text-red-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block">تقرير الفروقات والتسويات المالي</span>
            <h3 className="text-sm font-bold text-white mb-1.5 font-sans">توليد التقرير الختامي وتصدير كشوفات التدقيق؟</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              بصفتك مدير النظام المالي، بإمكانك فحص الإحصائيات الفعّالة لكفاية ونشاط الوكلاء في كافة المحافظات والمناطق اليمنية، ومعالجة وتصحيح العينات التالفة من السيريال المسجل.
            </p>
            <button 
              type="button" 
              onClick={() => alert('جاري معالجة قاعدة البيانات لتوليد التقرير المالي الموحد بصيغة PDF... تم الإرسال إلى بريدك المعتمد.')}
              className="mt-3.5 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>تحميل التقرير الموحد لمبيعات الوكلاء</span>
              <ArrowLeft size={12} className="rotate-180" />
            </button>
          </div>
          <div className="absolute left-6 -bottom-10 opacity-5 pointer-events-none group-hover:scale-105 transition-transform duration-500 hidden md:block">
            <span className="material-symbols-outlined text-[140px] font-bold text-slate-300">analytics</span>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-red-950/20 to-slate-900 border-r-4 border-red-500 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group">
          <div className="relative z-10 max-w-xl">
            <span className="bg-red-600/15 text-red-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block">طلب دفعة جديدة</span>
            <h3 className="text-sm font-bold text-white mb-1.5 font-sans">طلب كميات شرائح إضافية؟</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              عند اقتراب مخزون أحد بائعيك من النفاد، يمكنك طلب دفعة SIM فرعية جديدة من مزود الخدمة مباشرة بضغطة زر لضمان عدم انقطاع عمليات التفعيل للشرطة في الميدان.
            </p>
            <button 
              type="button" 
              onClick={() => alert('تم إرسال طلب تزويد مخزون إضافي إلى الإدارة، جاري التواصل معك في غضون ٢٤ ساعة...')}
              className="mt-3.5 px-5 py-2 bg-slate-950 hover:bg-slate-900 text-slate-100 font-bold text-xs rounded-xl border border-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>طلب مخزون إضافي من الإدارة</span>
              <ArrowLeft size={12} className="rotate-180" />
            </button>
          </div>
          <div className="absolute left-6 -bottom-10 opacity-5 pointer-events-none group-hover:scale-105 transition-transform duration-500 hidden md:block">
            <span className="material-symbols-outlined text-[140px] font-bold text-slate-300">inventory_2</span>
          </div>
        </div>
      )}

      {/* 3. Summary Cards for Operator Stock (Yemen Mobile, YOU, Sabafon) */}
      <h3 className="text-sm font-bold text-slate-300 pb-1">مخزون الوكيل المعتمد حالياً</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {inventories.map((inv) => {
          const isYm = inv.operator === 'yemen_mobile';
          const isYou = inv.operator === 'you';
          const colorBorder = isYm ? 'border-r-[#e60000]' : isYou ? 'border-r-[#ffcb05]' : 'border-r-blue-600';
          const colorText = isYm ? 'text-red-500' : isYou ? 'text-amber-400' : 'text-blue-500';
          const bgBadge = isYm ? 'bg-[#e60000]' : isYou ? 'bg-[#ffcb05]' : 'bg-blue-600';
          const badgeText = isYm ? 'يمن موبايل' : isYou ? 'YOU' : 'سبأفون';

          return (
            <div key={inv.operator} className={`bg-slate-900 border-r-4 ${colorBorder} border-y border-l border-slate-800 rounded-2xl p-5 shadow hover:shadow-lg transition-all`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-xl ${bgBadge} flex items-center justify-center shadow-lg shadow-black/20`}>
                    <span className="material-symbols-outlined text-white text-[18px]">signal_cellular_alt</span>
                  </div>
                  <span className="font-bold text-white text-sm">{badgeText}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] text-slate-500 font-medium">إجمالي الشرائح المتوفرة</h4>
                  <span className="text-2xl font-bold tracking-tight text-white">{inv.available}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-800/40 pt-3 text-right">
                  <div>
                    <h4 className="text-[9px] text-slate-500 font-medium">اجمالي المتبقي</h4>
                    <p className={`font-bold text-xs ${colorText}`}>{inv.remaining}</p>
                  </div>
                  <div>
                    <h4 className="text-[9px] text-slate-500 font-medium">الفترة الزمنية</h4>
                    <p className="font-semibold text-slate-300 text-xs">{inv.periodDays} يوم</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Sellers Management list layout (إدارة البائعين) */}
      <h3 className="text-sm font-bold text-slate-300 pb-1 pt-4">إدارة بائعي التجزئة ونقاط البيع</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sellers.map((seller) => (
          <div key={seller.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex items-start gap-4">
              {/* Profile image with validation */}
              <div className="w-13 h-13 rounded-full overflow-hidden border border-slate-800 shrink-0 bg-slate-950 flex items-center justify-center">
                {seller.avatar ? (
                  <img src={seller.avatar} alt={seller.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-slate-600 text-2xl">store</span>
                )}
              </div>
              <div className="flex-1 text-right">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-slate-100">{seller.name}</h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    seller.status === 'active' 
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                      : seller.status === 'low_stock'
                      ? 'bg-amber-950/40 text-amber-500 border border-amber-900/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {seller.status === 'active' ? 'نشط' : seller.status === 'low_stock' ? 'مخزون منخفض' : 'غير نشط'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{seller.storeName}</p>
                <div className="flex gap-4 items-center text-[10px] text-slate-500 mt-1">
                  <span>المعرف: {seller.id}</span>
                  <span className="font-sans" dir="ltr">{seller.phone}</span>
                </div>
              </div>
            </div>

            {/* Seller stats */}
            <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/40 text-right">
              <div>
                <span className="text-[9px] text-slate-500 block">المبيعات الشهرية</span>
                <span className="text-xs font-bold text-slate-200">{seller.totalSales} ر.س</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">المخزون المتوفر</span>
                <span className="text-xs font-bold text-slate-200">{seller.currentStock}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">كفاءة المخزون</span>
                <span className={`text-xs font-bold ${seller.efficiency >= 50 ? 'text-emerald-400' : 'text-red-500'}`}>
                  {seller.efficiency}%
                </span>
              </div>
            </div>

            {/* Quick Actions buttons */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedSeller(seller);
                  setSellerDetailsOpen(true);
                }}
                className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Eye size={12} />
                <span>عرض التفاصيل</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenTransferWithSeller(seller)}
                  className="px-3 py-1.5 bg-red-650 hover:bg-red-500/10 text-red-500 border border-red-900/30 hover:border-red-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Send size={10} />
                  <span>تحويل رصيد/سيرال</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSeller(seller);
                    setSellerActionsOpen(true);
                  }}
                  className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 cursor-pointer transition-colors"
                  title="المزيد من الإجراءات"
                >
                  <SlidersHorizontal size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 5. Sim Inventory list section */}
      <h3 className="text-sm font-bold text-slate-300 pb-1 pt-4">إدارة وسجلات الشرائح الذكية</h3>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الفئة أو رقم الـ ICCID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-full pr-10 pl-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-sans"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-red-600"
            >
              <option value="all">كل الحالات الإلكترونية</option>
              <option value="available">متوفر للبيع</option>
              <option value="sold">تم بيعه وتفعيله</option>
            </select>

            <select
              value={operatorFilter}
              onChange={(e: any) => setOperatorFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-red-600"
            >
              <option value="all">كل شبكات المحمول</option>
              <option value="yemen_mobile">يمن موبايل</option>
              <option value="sabafon">سبأفون</option>
              <option value="you">YOU</option>
            </select>
          </div>
        </div>

        {/* SIM Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                <th className="p-4 font-bold text-slate-400">بيانات الشريحة والباركود (ICCID)</th>
                <th className="p-4 font-bold text-slate-400">المشغل</th>
                <th className="p-4 font-bold text-slate-400">الفئة والنوع</th>
                <th className="p-4 font-bold text-slate-400">تاريخ الإدراج</th>
                <th className="p-4 font-bold text-slate-400 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredSims.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-light">
                    لا توجد سجلات شرائح مطابقة لبحثك الحالي.
                  </td>
                </tr>
              ) : (
                filteredSims.map((sim) => (
                  <tr key={sim.id} className="hover:bg-slate-950/30 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-100 select-all" dir="ltr">
                      {sim.iccid}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        sim.operator === 'yemen_mobile' 
                          ? 'bg-red-950/30 text-red-500' 
                          : sim.operator === 'you' 
                          ? 'bg-amber-950/30 text-amber-500' 
                          : 'bg-blue-950/30 text-blue-500'
                      }`}>
                        {sim.operator === 'yemen_mobile' ? 'يمن موبايل' : sim.operator === 'you' ? 'YOU' : 'سبأفون'}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-300">
                      {sim.category}
                    </td>
                    <td className="p-4 text-slate-400">
                      {sim.dateAdded}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sim.status === 'available'
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                          : sim.status === 'sold'
                          ? 'bg-blue-950/40 text-blue-400 border border-blue-900/30'
                          : sim.status === 'reserved'
                          ? 'bg-amber-950/40 text-amber-500 border border-amber-900/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}>
                        {sim.status === 'available' ? 'متوفر' : sim.status === 'sold' ? 'مباع' : sim.status === 'reserved' ? 'محجوز' : 'غير نشط'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-slate-950/40 text-[10px] text-slate-500 flex justify-between items-center">
          <span>عرض {filteredSims.length} من إجمالي {sims.length} شريحة مسجلة</span>
          <span>آخر تحديث تلقائي للمزامنة: قبل ثانية واحدة</span>
        </div>

      </div>

      {/* ========================================================== */}
      {/* 6. MODAL DIALOGS AND BOTTOM SHEETS (matching user images) */}
      {/* ========================================================== */}
      
      {/* Modal A: SIM Transfer Dialog ("تحويل شرائح إلى البائع") */}
      <AnimatePresence>
        {transferModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTransferModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-y-auto no-scrollbar max-h-[90vh] text-slate-200"
            >
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">تحويل شرائح إلى بائع</h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    أدخل شركة الاتصالات ونطاق السيريال لحساب الكمية وتحويلها فوراً
                  </p>
                </div>
                <button 
                  onClick={() => setTransferModalOpen(false)}
                  className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-5 text-right">
                
                {/* Step 1: Carrier selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400">الخطوة 1: اختر شركة الاتصالات</label>
                  <select
                    value={transferOp}
                    onChange={(e: any) => setTransferOp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-red-600 transition-colors"
                  >
                    <option value="yemen_mobile">يمن موبايل (Yemen Mobile)</option>
                    <option value="sabafon">سبأفون (Sabafon)</option>
                    <option value="you">YOU (واي)</option>
                  </select>
                </div>

                {/* Step 2: Serial ranges input */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400">الخطوة 2: حدد نطاق الأرقام التسلسلية</label>
                  <p className="text-[9px] text-slate-500">أدخل السيريال الأول والأخير لحساب الكميات تلقائياً.</p>
                  
                  <div className="grid grid-cols-2 gap-3" dir="ltr">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 block text-right">إلى رقم</span>
                      <input
                        type="text"
                        value={endRange}
                        onChange={(e) => setEndRange(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-center outline-none focus:border-red-600 transition-colors font-sans"
                        placeholder="89967..."
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 block text-right">من رقم</span>
                      <input
                        type="text"
                        value={startRange}
                        onChange={(e) => setStartRange(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-center outline-none focus:border-red-600 transition-colors font-sans"
                        placeholder="89961..."
                      />
                    </div>
                  </div>
                </div>

                {/* Step 3: Computed Quantity Display */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-400">الكمية المحسوبة المبدئية</label>
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-white font-extrabold font-sans text-center">
                    {calculatedQty > 0 ? `${calculatedQty} شرائح` : 'الرجاء إدخال نطاق سيريال صالح'}
                  </div>
                </div>

                {/* Step 4: Summary container */}
                <div className="bg-[#0f141f] border border-slate-800 rounded-xl p-4 text-right">
                  <h4 className="text-[10px] font-bold text-red-500 mb-2 pb-1 border-b border-slate-800">ملخص العملية</h4>
                  <div className="space-y-2 text-[11px] font-light">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>المستلم:</span>
                      <span className="text-slate-100 font-bold">
                        {sellers.find(s => s.id === targetSellerId)?.name || 'الرجاء اختيار البائع'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>شركة الاتصالات:</span>
                      <span className="text-slate-100 font-bold">
                        {transferOp === 'yemen_mobile' ? 'يمن موبايل' : transferOp === 'you' ? 'YOU' : 'سبأفون'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>إجمالي النطاق:</span>
                      <span className="text-slate-100 font-sans font-semibold">
                        {startRange && endRange ? `${startRange} - ${endRange}` : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800/40">
                      <span>إجمالي الكمية:</span>
                      <span className="text-red-400 font-extrabold">{calculatedQty} شريحة</span>
                    </div>
                  </div>
                </div>

                {/* Recipient select under Modal */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400">المستلم المعتمد لرحلة الشرائح</label>
                  <select
                    value={targetSellerId}
                    onChange={(e) => setTargetSellerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-red-600 transition-colors text-slate-200"
                  >
                    <option value="" disabled>اختر البائع المستهدف...</option>
                    {sellers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} - {s.storeName}</option>
                    ))}
                  </select>
                </div>

                {/* Submit block buttons */}
                <div className="flex flex-col gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={isTransferring || calculatedQty <= 0 || !targetSellerId}
                    className="w-full h-11 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    {isTransferring ? (
                      <RefreshCw className="animate-spin text-white" size={14} />
                    ) : (
                      <>
                        <Send size={12} />
                        <span>تأكيد تحويل الكمية للبائع</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferModalOpen(false)}
                    className="w-full h-11 bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    إلغاء العملية
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal B: Seller Details Bottom Sheet ("تفاصيل البائع") */}
      <AnimatePresence>
        {sellerDetailsOpen && selectedSeller && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSellerDetailsOpen(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-slate-900 border-t border-slate-800 rounded-t-[32px] p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              {/* Close handle indicator */}
              <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-6" />

              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-bold text-white">تفاصيل البائع والاعتماد</h3>
                <button 
                  onClick={() => setSellerDetailsOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Profile card avatar content */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 rounded-full border-4 border-slate-850 shadow-md overflow-hidden bg-slate-950 mb-3 flex items-center justify-center">
                  {selectedSeller.avatar ? (
                    <img src={selectedSeller.avatar} alt={selectedSeller.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-slate-600">store</span>
                  )}
                </div>
                <h4 className="font-bold text-lg text-white">{selectedSeller.name}</h4>
                <p className="text-xs text-slate-400 mt-1">{selectedSeller.storeName}</p>
              </div>

              {/* Specs detailed card stack */}
              <div className="space-y-3 bg-slate-950/40 p-5 rounded-2xl border border-slate-800 mb-6 text-right">
                <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                  <span className="text-slate-500 text-xs font-semibold">رقم هوية البائع:</span>
                  <span className="text-slate-200 text-xs font-mono font-bold">{selectedSeller.idNumber}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                  <span className="text-slate-500 text-xs font-semibold">الهاتف المقترن:</span>
                  <span className="text-slate-200 text-xs font-mono font-bold" dir="ltr">{selectedSeller.phone}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                  <span className="text-slate-500 text-xs font-semibold">التغطية والمنطقة الجغرافية:</span>
                  <span className="text-slate-200 text-xs font-bold">{selectedSeller.region}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                  <span className="text-slate-500 text-xs font-semibold">تاريخ التسجيل والاعتماد:</span>
                  <span className="text-slate-200 text-xs font-bold">{selectedSeller.creationDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs font-semibold">آخر نشاط مسجل:</span>
                  <span className="text-slate-200 text-xs font-bold">{selectedSeller.lastLogin}</span>
                </div>
              </div>

              {/* Dialog buttons control */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSellerDetailsOpen(false);
                    handleOpenTransferWithSeller(selectedSeller);
                  }}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  تعديل بيانات البائع أو تحويل شرائح
                </button>
                <button
                  type="button"
                  onClick={() => setSellerDetailsOpen(false)}
                  className="w-full py-3 text-slate-400 hover:text-slate-250 text-xs rounded-xl hover:bg-slate-800 cursor-pointer text-center"
                >
                  إغلاق نافذة التفاصيل
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal C: Seller Action Sheet Menu ("إجراءات البائع") */}
      <AnimatePresence>
        {sellerActionsOpen && selectedSeller && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSellerActionsOpen(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-slate-900 border-t border-slate-800 rounded-t-[32px] p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              {/* Slider handler indicator */}
              <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-6" />

              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-bold text-white">إجراءات البائع والاعتماد</h3>
                  <p className="text-[11px] text-slate-400 mt-1">تعديل أو تغيير وضعية ونشاط الحساب لـ "{selectedSeller.name}"</p>
                </div>
                <button 
                  onClick={() => setSellerActionsOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Action Buttons Link stack */}
              <div className="space-y-2 text-right">
                
                {/* 1. Reset password option */}
                <button
                  type="button"
                  onClick={() => handleResetPasswordClick(selectedSeller)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-800/40 text-slate-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400 bg-slate-950 p-2.5 rounded-xl group-hover:text-red-500 transition-colors">lock_reset</span>
                    <div>
                      <p className="font-bold text-xs text-white">إعادة تعيين كلمة المرور</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">تحديث تلقائي وإرسال الكود للبائع عبر SMS</p>
                    </div>
                  </div>
                  <ArrowLeft size={16} />
                </button>

                {/* 2. Suspend/Activate account option */}
                <button
                  type="button"
                  onClick={() => handleToggleStatusClick(selectedSeller)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all group ${
                    selectedSeller.status === 'inactive'
                      ? 'border-emerald-950/20 hover:bg-emerald-950/20 text-emerald-400'
                      : 'border-yellow-950/20 hover:bg-yellow-950/20 text-yellow-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined bg-slate-950 p-2.5 rounded-xl group-hover:scale-105 transition-transform">
                      {selectedSeller.status === 'inactive' ? 'check_circle' : 'block'}
                    </span>
                    <div>
                      <p className="font-bold text-xs text-white">
                        {selectedSeller.status === 'inactive' ? 'تفعيل الحساب والاعتماد' : 'إيقاف الحساب مؤقتاً'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {selectedSeller.status === 'inactive' 
                          ? 'السماح مجدداً للبائع بإجراء تفعيل الشرائح في الميدان' 
                          : 'منع البائع مؤقتاً من بيع وتفعيل الشرائح وعقد الخدمات'
                        }
                      </p>
                    </div>
                  </div>
                  <ArrowLeft size={16} />
                </button>

              </div>

              {/* Cancel actions footer */}
              <div className="mt-8 mb-4">
                <button
                  type="button"
                  onClick={() => setSellerActionsOpen(false)}
                  className="w-full py-3.5 rounded-xl bg-slate-800 text-slate-100 font-bold text-xs hover:bg-slate-750 transition-colors cursor-pointer"
                >
                  إلغاء الإجراءات
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
