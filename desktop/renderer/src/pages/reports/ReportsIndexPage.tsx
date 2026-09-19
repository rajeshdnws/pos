import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Boxes,
  DollarSign,
  Wallet,
  LayoutDashboard,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { ReportDashboard } from './ReportDashboard';
import { SalesReport } from './SalesReport';
import { PurchaseReport } from './PurchaseReport';
import { InventoryReport } from './InventoryReport';
import { FinancialReport } from './FinancialReport';
import { CashReport } from './CashReport';

type ReportSection =
  | 'dashboard'
  | 'sales'
  | 'purchase'
  | 'inventory'
  | 'financial'
  | 'cash';

interface NavItem {
  id: ReportSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
    description: 'KPIs & charts',
    color: 'brand',
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: TrendingUp,
    description: 'Revenue & invoices',
    color: 'emerald',
  },
  {
    id: 'purchase',
    label: 'Purchase',
    icon: ShoppingCart,
    description: 'Procurement costs',
    color: 'violet',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    description: 'Stock & valuation',
    color: 'amber',
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: DollarSign,
    description: 'P&L, outstanding & tax',
    color: 'rose',
  },
  {
    id: 'cash',
    label: 'Cash & Registers',
    icon: Wallet,
    description: 'Cashbook & closings',
    color: 'cyan',
  },
];

const COLOR_MAP: Record<string, string> = {
  brand: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
};

const ACTIVE_MAP: Record<string, string> = {
  brand: 'bg-brand-600 text-white shadow-lg shadow-brand-600/20',
  emerald: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20',
  violet: 'bg-violet-600 text-white shadow-lg shadow-violet-600/20',
  amber: 'bg-amber-600 text-white shadow-lg shadow-amber-600/20',
  rose: 'bg-rose-600 text-white shadow-lg shadow-rose-600/20',
  cyan: 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20',
};

export const ReportsIndexPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<ReportSection>('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  const activeNav = NAV_ITEMS.find((n) => n.id === activeSection)!;

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex h-full overflow-hidden bg-surface-950">
      {/* Report Sidebar */}
      <aside className="w-56 shrink-0 border-r border-surface-800/80 bg-surface-950 flex flex-col py-4 px-2 gap-1 overflow-y-auto">
        <div className="px-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-brand-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Reports</div>
              <div className="text-[10px] text-slate-500">Analytics Suite</div>
            </div>
          </div>
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                isActive
                  ? ACTIVE_MAP[item.color]
                  : 'text-slate-400 hover:text-slate-100 hover:bg-surface-900/80'
              }`}
            >
              <div
                className={`h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-white/15 border-white/20' : COLOR_MAP[item.color]
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">{item.label}</div>
                <div
                  className={`text-[10px] truncate ${
                    isActive ? 'text-white/60' : 'text-slate-500'
                  }`}
                >
                  {item.description}
                </div>
              </div>
              {isActive && <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 opacity-60" />}
            </button>
          );
        })}
      </aside>

      {/* Main Report Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Section Header */}
        <div className="h-14 border-b border-surface-800/80 bg-surface-950/95 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <div
              className={`h-7 w-7 rounded-lg border flex items-center justify-center ${COLOR_MAP[activeNav.color]}`}
            >
              {React.createElement(activeNav.icon, { className: 'h-3.5 w-3.5' })}
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">{activeNav.label} Reports</h1>
              <p className="text-[10px] text-slate-500">{activeNav.description}</p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-900 border border-surface-700 text-slate-400 hover:text-white hover:border-surface-600 transition-all text-xs font-medium"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {/* Report Body */}
        <div className="flex-1 overflow-y-auto">
          {activeSection === 'dashboard' && <ReportDashboard key={refreshKey} />}
          {activeSection === 'sales' && <SalesReport key={refreshKey} />}
          {activeSection === 'purchase' && <PurchaseReport key={refreshKey} />}
          {activeSection === 'inventory' && <InventoryReport key={refreshKey} />}
          {activeSection === 'financial' && <FinancialReport key={refreshKey} />}
          {activeSection === 'cash' && <CashReport key={refreshKey} />}
        </div>
      </div>
    </div>
  );
};
