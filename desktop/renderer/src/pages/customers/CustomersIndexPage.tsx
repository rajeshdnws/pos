import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText } from 'lucide-react';
import { CustomerListPage } from './CustomerListPage';
import { CustomerLedgerPage } from './CustomerLedgerPage';

export type CustomerTabType = 'list' | 'ledger';

export const CustomersIndexPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CustomerTabType>('list');
  const [activeLedgerCustomerId, setActiveLedgerCustomerId] = useState<string | undefined>(undefined);

  const handleViewLedger = (customerId: string) => {
    setActiveLedgerCustomerId(customerId);
    setActiveTab('ledger');
  };

  const handleNewSale = (customerId: string) => {
    navigate('/sales', { state: { customerId, action: 'pos' } });
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-surface-800 space-x-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
            activeTab === 'list'
              ? 'border-brand-500 text-brand-400 bg-brand-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-800/40'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Customer Directory</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
            activeTab === 'ledger'
              ? 'border-brand-500 text-brand-400 bg-brand-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-800/40'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Khata Ledger & Statements</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && (
        <CustomerListPage
          onViewLedger={handleViewLedger}
          onNewSale={handleNewSale}
        />
      )}

      {activeTab === 'ledger' && (
        <CustomerLedgerPage
          initialCustomerId={activeLedgerCustomerId}
          onBack={() => setActiveTab('list')}
          onNewSale={handleNewSale}
        />
      )}
    </div>
  );
};
