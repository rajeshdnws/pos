import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, FileText } from 'lucide-react';
import { SupplierListPage } from './SupplierListPage';
import { SupplierLedgerPage } from './SupplierLedgerPage';

export type SupplierTabType = 'list' | 'ledger';

export const SuppliersIndexPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SupplierTabType>('list');
  const [activeLedgerSupplierId, setActiveLedgerSupplierId] = useState<string | undefined>(undefined);

  const handleViewLedger = (supplierId: string) => {
    setActiveLedgerSupplierId(supplierId);
    setActiveTab('ledger');
  };

  const handleNewPurchase = (supplierId: string) => {
    navigate('/purchase', { state: { supplierId, action: 'new' } });
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-surface-800 space-x-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
            activeTab === 'list'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-800/40'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Supplier Directory</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
            activeTab === 'ledger'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-800/40'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Ledger & Statements</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && (
        <SupplierListPage
          onViewLedger={handleViewLedger}
          onNewPurchase={handleNewPurchase}
        />
      )}

      {activeTab === 'ledger' && (
        <SupplierLedgerPage
          initialSupplierId={activeLedgerSupplierId}
          onBack={() => setActiveTab('list')}
        />
      )}
    </div>
  );
};
