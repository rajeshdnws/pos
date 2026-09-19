import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  LayoutDashboard,
  RotateCcw,
  Truck,
} from 'lucide-react';
import { PurchaseDashboardTab } from './PurchaseDashboardTab';
import { PurchaseListPage } from './PurchaseListPage';
import { PurchaseFormPage } from './PurchaseFormPage';
import { PurchaseReturnListPage } from './PurchaseReturnListPage';
import { PurchaseDetailsModal } from './PurchaseDetailsModal';

export type PurchaseTabType = 'dashboard' | 'invoices' | 'returns' | 'form';

export const PurchasesIndexPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<PurchaseTabType>('dashboard');
  const [editPurchaseId, setEditPurchaseId] = useState<string | null>(null);
  const [formInitialSupplierId, setFormInitialSupplierId] = useState<string | null>(null);
  const [viewDetailsPurchaseId, setViewDetailsPurchaseId] = useState<string | null>(null);

  useEffect(() => {
    // Check if routed with state (e.g. from Supplier Details -> New Purchase)
    if (location.state && (location.state as any).action === 'new') {
      const suppId = (location.state as any).supplierId;
      if (suppId) {
        setFormInitialSupplierId(suppId);
      }
      setEditPurchaseId(null);
      setActiveTab('form');
    }
  }, [location.state]);

  const handleStartNewPurchase = () => {
    setEditPurchaseId(null);
    setFormInitialSupplierId(null);
    setActiveTab('form');
  };

  const handleEditPurchase = (id: string) => {
    setEditPurchaseId(id);
    setFormInitialSupplierId(null);
    setActiveTab('form');
  };

  const handleFormBack = () => {
    setEditPurchaseId(null);
    setFormInitialSupplierId(null);
    setActiveTab('invoices');
  };

  const handleSavedPurchase = () => {
    setEditPurchaseId(null);
    setFormInitialSupplierId(null);
    setActiveTab('invoices');
  };

  return (
    <div className="space-y-6">
      {/* Top Level Tab Navigation (Hidden when in full form view) */}
      {activeTab !== 'form' && (
        <div className="flex border-b border-surface-800 space-x-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-800/40'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'invoices'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-800/40'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Purchase Invoices</span>
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'returns'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-800/40'
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Returns & Debit Notes</span>
          </button>

          <button
            onClick={() => navigate('/suppliers')}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-800/40 whitespace-nowrap"
          >
            <Truck className="h-4 w-4" />
            <span>Supplier Directory</span>
          </button>
        </div>
      )}

      {/* Tab Pages */}
      {activeTab === 'dashboard' && (
        <PurchaseDashboardTab
          onNewPurchase={handleStartNewPurchase}
          onViewPurchases={() => setActiveTab('invoices')}
          onViewReturns={() => setActiveTab('returns')}
          onViewSuppliers={() => navigate('/suppliers')}
          onSelectPurchase={(pId) => setViewDetailsPurchaseId(pId)}
        />
      )}

      {activeTab === 'invoices' && (
        <PurchaseListPage
          onNewPurchase={handleStartNewPurchase}
          onEditPurchase={handleEditPurchase}
        />
      )}

      {activeTab === 'returns' && <PurchaseReturnListPage />}

      {activeTab === 'form' && (
        <PurchaseFormPage
          editPurchaseId={editPurchaseId}
          initialSupplierId={formInitialSupplierId}
          onBack={handleFormBack}
          onSaved={handleSavedPurchase}
        />
      )}

      {/* Details Modal when clicking from Dashboard */}
      <PurchaseDetailsModal
        isOpen={Boolean(viewDetailsPurchaseId)}
        purchaseId={viewDetailsPurchaseId}
        onClose={() => setViewDetailsPurchaseId(null)}
        onEditDraft={(pId) => {
          setViewDetailsPurchaseId(null);
          handleEditPurchase(pId);
        }}
        onUpdated={() => {
          // Handled internally
        }}
      />
    </div>
  );
};
