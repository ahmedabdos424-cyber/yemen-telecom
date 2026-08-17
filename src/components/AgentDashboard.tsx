/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useToast, ToastContainer } from '../hooks/useToast';
import { Plus } from 'lucide-react';
import type { Seller, Sim, OperatorInventory, Operator, Role, Operation } from '../types';
import SellerListView from './agent/SellerListView';
import SimsListView from './sims/SimsListView';
import QuickActionsSection from './agent/QuickActionsSection';
import InventorySummaryCards from './agent/InventorySummaryCards';
import RecentOperationsTable from './agent/RecentOperationsTable';
import TransferSimModal from './agent/TransferSimModal';
import SellerDetailsSheet from './agent/SellerDetailsSheet';
import SellerActionsSheet from './agent/SellerActionsSheet';

interface AgentDashboardProps {
  role: Role;
  activeTab?: string;
  sellers: Seller[];
  sims: Sim[];
  inventories: OperatorInventory[];
  onAddSeller: () => void; // Redirects active tab to 'add_seller'
  onActivateSim?: () => void; // Redirects active tab to 'activate'
  onTransferSims: (operator: Operator, count: number, startSerial: string, endSerial: string, recipientName: string) => Promise<unknown>;
  onUpdateSellerStatus: (sellerId: string, status: 'active' | 'inactive') => void;
  onResetSellerPassword: (sellerId: string) => void;
  onEditSeller: (seller: Seller) => void;
  onDeleteSeller: (sellerId: string) => Promise<void>;
  onUpdateInventories: (inventories: OperatorInventory[]) => void;
  operations?: Operation[];
  username: string;
  onLogout: () => void;
  onConfirmLogout?: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onUpdateSims?: (updated: Sim[]) => void;
  onUpdateSellers?: (updated: Seller[]) => void;
}

export default function AgentDashboard({
  role,
  activeTab = 'home',
  sellers = [],
  sims = [],
  inventories = [],
  onAddSeller,
  onActivateSim,
  onTransferSims,
  onUpdateSellerStatus,
  onResetSellerPassword,
  onEditSeller,
  onDeleteSeller,
  onUpdateInventories,
  operations = []
}: AgentDashboardProps) {
  // Modals state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferOpenSeq, setTransferOpenSeq] = useState(0);
  const [transferTargetSellerId, setTransferTargetSellerId] = useState('');
  const [selectedSeller] = useState<Seller | null>(null);
  const [sellerActionsOpen, setSellerActionsOpen] = useState(false);
  const [sellerDetailsOpen, setSellerDetailsOpen] = useState(false);

  const { toasts, dismissToast } = useToast();

  const openTransferModal = (seller?: Seller) => {
    setTransferTargetSellerId(seller?.id ?? '');
    setTransferOpenSeq(seq => seq + 1);
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
    <div dir="rtl" className="space-y-8 font-sans pb-16 safe-bottom">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            {role === 'manager'
              ? 'بوابة الرقابة والتحكم للمدير العام'
              : ''}
          </h1>

        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'sellers' && (
            <button
              onClick={onAddSeller}
              className="bg-red-600 hover:bg-red-500 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>{role === 'manager' ? 'إنشاء حساب مستخدم/بائع جديد' : 'إضافة بائع جديد'}</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'sellers' ? (
        <SellerListView
          sellers={sellers}
          onUpdateSellerStatus={onUpdateSellerStatus}
          onResetSellerPassword={onResetSellerPassword}
          onEditSeller={onEditSeller}
          onDeleteSeller={onDeleteSeller}
          onAllocateSims={(sellerId) => openTransferModal(sellers.find(s => String(s.id) === sellerId))}
        />
      ) : activeTab === 'my_sims' ? (
        <SimsListView
          sims={sims}
          mode="agent"
        />
      ) : (
        <>
          {/* Main Dashboard / Home Layout */}

          {/* Quick Actions AT THE TOP (Replacing 'طلب دفعة جديدة' for agent) */}
          <QuickActionsSection role={role} onActivateSim={onActivateSim} />

          {/* 3. Summary Cards for Operator Stock & Sellers Statistics */}
          <InventorySummaryCards
            inventories={inventories}
            sellers={sellers}
            onUpdateInventories={onUpdateInventories}
            onAddSeller={onAddSeller}
          />

          {/* 5. Recent Operations Table (آخر العمليات) */}
          <h3 className="text-sm font-bold text-slate-300 pb-1 pt-4 font-sans">آخر العمليات</h3>
          <RecentOperationsTable operations={operations} />
        </>
      )}

      {/* ========================================================== */}
      {/* 6. MODAL DIALOGS AND BOTTOM SHEETS (matching user images) */}
      {/* ========================================================== */}

      {/* Modal A: SIM Transfer Dialog ("تحويل شرائح إلى البائع") */}
      <TransferSimModal
        key={transferOpenSeq}
        open={transferModalOpen}
        sellers={sellers}
        inventories={inventories}
        initialSellerId={transferTargetSellerId}
        onTransferSims={onTransferSims}
        onClose={() => setTransferModalOpen(false)}
      />

      {/* Modal B: Seller Details Bottom Sheet ("تفاصيل البائع") */}
      <SellerDetailsSheet
        open={sellerDetailsOpen}
        seller={selectedSeller}
        onClose={() => setSellerDetailsOpen(false)}
        onTransferTo={(seller) => openTransferModal(seller)}
      />

      {/* Modal C: Seller Action Sheet Menu ("إجراءات البائع") */}
      <SellerActionsSheet
        open={sellerActionsOpen}
        seller={selectedSeller}
        onClose={() => setSellerActionsOpen(false)}
        onResetPassword={handleResetPasswordClick}
        onToggleStatus={handleToggleStatusClick}
      />
    </div>
  );
}