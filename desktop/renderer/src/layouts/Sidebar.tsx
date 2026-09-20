import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  Boxes,
  Users,
  Truck,
  BarChart3,
  Settings,
  Store,
  Wallet,
  CircleDollarSign,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { name: 'Products', to: '/products', icon: Package, permission: 'products.view' },
  { name: 'Purchase', to: '/purchase', icon: ShoppingCart, permission: 'purchase.view' },
  { name: 'Sales', to: '/sales', icon: Receipt, permission: 'sales.view' },
  { name: 'Cash Register', to: '/cash-register', icon: CircleDollarSign, permission: 'cashRegister.view' },
  { name: 'Expenses', to: '/expenses', icon: Wallet, permission: 'expense.view' },
  { name: 'Inventory', to: '/inventory', icon: Boxes, permission: 'inventory.view' },
  { name: 'Customers', to: '/customers', icon: Users, permission: 'customers.view' },
  { name: 'Suppliers', to: '/suppliers', icon: Truck, permission: 'suppliers.view' },
  { name: 'Promotions', to: '/promotions', icon: Sparkles, permission: 'promotions.view' },
  { name: 'Communication', to: '/communication', icon: MessageSquare, permission: 'communication.view' },
  { name: 'Reports', to: '/reports', icon: BarChart3, permission: 'reports.view' },
  { name: 'Settings', to: '/settings/business', icon: Settings, permission: 'settings.view' },
];

export const Sidebar: React.FC = () => {
  const { hasPermission, company } = useAuthStore();

  const filteredNavItems = navItems.filter((item) => hasPermission(item.permission));

  return (
    <aside className="w-64 border-r border-surface-800/80 bg-surface-950 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-surface-800/80 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0 overflow-hidden">
          {company?.logoPath ? (
            <img src={company.logoPath} alt="Logo" className="h-full w-full object-contain p-0.5" />
          ) : (
            <Store className="h-5 w-5" />
          )}
        </div>
        <div className="overflow-hidden">
          <div className="text-sm font-semibold tracking-wide text-white truncate">
            {company?.businessName || company?.name || 'RS Inventory'}
          </div>
          <div className="text-[11px] font-medium text-brand-400 uppercase tracking-wider">
            Solo Edition
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-surface-700">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-surface-900/80'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Offline Status Badge in Sidebar Footer */}
      <div className="p-4 border-t border-surface-800/80">
        <div className="rounded-xl bg-surface-900/90 border border-surface-800 p-3 flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-slate-200">Offline-First Mode</div>
            <div className="text-[10px] text-slate-400 truncate">Local SQLite Active</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
