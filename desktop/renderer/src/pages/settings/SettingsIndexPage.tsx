import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  User,
  Building2,
  Receipt,
  Coins,
  Percent,
  Package,
  Users,
  ShieldCheck,
  Sliders,
  HardDriveDownload,
  FileKey,
  Info,
  Database,
  KeyRound,
  Sparkles,
  MessageSquare,
  Gift,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const SettingsIndexPage: React.FC = () => {
  const { hasPermission } = useAuthStore();

  const navLinks = [
    { to: '/settings/business', label: 'Company Profile', icon: Building2, permission: 'settings.view' },
    { to: '/settings/loyalty', label: 'Loyalty & Wallet', icon: Gift, permission: 'loyalty.view' },
    { to: '/communication', label: 'Communication Settings', icon: MessageSquare, permission: 'communication.view' },
    { to: '/promotions', label: 'Promotions & Coupons', icon: Sparkles, permission: 'promotions.view' },
    { to: '/settings/license', label: 'Product License', icon: KeyRound, permission: 'settings.view' },
    { to: '/settings/invoice', label: 'Invoice & Printing', icon: Receipt, permission: 'settings.view' },
    { to: '/settings/currency', label: 'Currency & Formats', icon: Coins, permission: 'settings.view' },
    { to: '/settings/tax-pricing', label: 'Tax & Pricing', icon: Percent, permission: 'settings.view' },
    { to: '/settings/inventory', label: 'Inventory Rules', icon: Package, permission: 'settings.view' },
    { to: '/settings/users', label: 'Users', icon: Users, permission: 'users.view' },
    { to: '/settings/roles', label: 'Roles & Matrix', icon: ShieldCheck, permission: 'users.view' },
    { to: '/settings/application', label: 'App Preferences', icon: Sliders, permission: 'settings.view' },
    { to: '/settings/backup', label: 'Backup & Recovery', icon: HardDriveDownload, permission: 'settings.view' },
    { to: '/settings/security-audit', label: 'Security & Audit', icon: FileKey, permission: 'settings.view' },
    { to: '/settings/about', label: 'About RS Inventory', icon: Info, permission: null },
    { to: '/settings/profile', label: 'My Profile', icon: User, permission: null },
    { to: '/settings/data', label: 'Demo Data', icon: Database, permission: 'settings.view' },
  ];

  return (
    <div className="space-y-6">
      {/* Settings Navigation Header & Tabs */}
      <div className="border-b border-surface-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-surface-700">
          {navLinks
            .filter((link) => !link.permission || hasPermission(link.permission))
            .map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all select-none ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800/60'
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
        </div>
      </div>

      <Outlet />
    </div>
  );
};
