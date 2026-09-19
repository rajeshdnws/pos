import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { POSBillingTab } from './POSBillingTab';
import { SalesListPage } from './SalesListPage';
import { SalesDashboardTab } from './SalesDashboardTab';
import { SalesReturnListPage } from './SalesReturnListPage';

export type SalesTabType = 'pos' | 'invoices' | 'dashboard' | 'returns';

export const SalesIndexPage: React.FC = () => {
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<SalesTabType>('pos');
  const [initialCustomerId, setInitialCustomerId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (location.state && (location.state as any).action === 'pos') {
      const custId = (location.state as any).customerId;
      if (custId) {
        setInitialCustomerId(custId);
      }
      setActiveTab('pos');
    }
  }, [location.state]);

  return (
    <div className="space-y-6">
      {/* Tab Navigation Header */}
      <div className="flex border-b border-surface-800 space-x-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'pos'
              ? 'border-brand-500 text-brand-400 bg-brand-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-800/40'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>POS Billing (F2)</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'invoices'
              ? 'border-brand-500 text-brand-400 bg-brand-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-800/40'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Sales Invoices</span>
        </button>

        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'border-brand-500 text-brand-400 bg-brand-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-800/40'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Sales Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('returns')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'returns'
              ? 'border-brand-500 text-brand-400 bg-brand-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-800/40'
          }`}
        >
          <RotateCcw className="h-4 w-4" />
          <span>Sales Returns</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'pos' && (
        <POSBillingTab initialCustomerId={initialCustomerId} />
      )}

      {activeTab === 'invoices' && (
        <SalesListPage onNewPOSBill={() => setActiveTab('pos')} />
      )}

      {activeTab === 'dashboard' && (
        <SalesDashboardTab
          onStartPOS={() => setActiveTab('pos')}
          onViewAllInvoices={() => setActiveTab('invoices')}
        />
      )}

      {activeTab === 'returns' && <SalesReturnListPage />}
    </div>
  );
};
