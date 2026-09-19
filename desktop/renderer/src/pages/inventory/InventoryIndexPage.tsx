import React, { useState } from 'react';
import {
  LayoutDashboard,
  Boxes,
  History,
  Scale,
  ClipboardCheck,
  ArrowRightLeft,
  Wrench,
  Warehouse,
} from 'lucide-react';
import { InventoryDashboardTab } from './InventoryDashboardTab';
import { CurrentStockTab } from './CurrentStockTab';
import { StockHistoryTab } from './StockHistoryTab';
import { StockAdjustmentTab } from './StockAdjustmentTab';
import { StocktakeTab } from './StocktakeTab';
import { StockTransferTab } from './StockTransferTab';
import { StockReconciliationTab } from './StockReconciliationTab';
import { StorageLocationsTab } from './StorageLocationsTab';

export type InventoryTabType =
  | 'dashboard'
  | 'current'
  | 'movements'
  | 'adjustments'
  | 'stocktake'
  | 'transfers'
  | 'reconciliation'
  | 'locations';

export const InventoryIndexPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InventoryTabType>('dashboard');

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Boxes className="h-7 w-7 text-indigo-400" />
            <span>Inventory & Stock Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative transactional stock ledger, physical audits, multi-location transfers, and real-time valuation.
          </p>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-slate-800 space-x-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('current')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'current'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>Current Stock</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'movements'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Stock History</span>
        </button>

        <button
          onClick={() => setActiveTab('adjustments')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'adjustments'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Scale className="h-4 w-4" />
          <span>Adjustments</span>
        </button>

        <button
          onClick={() => setActiveTab('stocktake')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'stocktake'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          <span>Physical Stocktake</span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'transfers'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <ArrowRightLeft className="h-4 w-4" />
          <span>Transfers</span>
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'reconciliation'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Wrench className="h-4 w-4" />
          <span>Reconciliation</span>
        </button>

        <button
          onClick={() => setActiveTab('locations')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'locations'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Warehouse className="h-4 w-4" />
          <span>Storage Locations</span>
        </button>
      </div>

      {/* Active Tab View */}
      <div>
        {activeTab === 'dashboard' && <InventoryDashboardTab onNavigateTab={(t) => setActiveTab(t as any)} />}
        {activeTab === 'current' && <CurrentStockTab />}
        {activeTab === 'movements' && <StockHistoryTab />}
        {activeTab === 'adjustments' && <StockAdjustmentTab />}
        {activeTab === 'stocktake' && <StocktakeTab />}
        {activeTab === 'transfers' && <StockTransferTab />}
        {activeTab === 'reconciliation' && <StockReconciliationTab />}
        {activeTab === 'locations' && <StorageLocationsTab />}
      </div>
    </div>
  );
};
