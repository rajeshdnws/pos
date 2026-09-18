import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { User, Building2, Users, Sliders } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const SettingsIndexPage: React.FC = () => {
  const { hasPermission } = useAuthStore();

  const navLinks = [
    { to: '/settings/profile', label: 'My Profile', icon: User, permission: null },
    {
      to: '/settings/business',
      label: 'Business Profile',
      icon: Building2,
      permission: 'settings.view',
    },
    { to: '/settings/users', label: 'Users & Roles', icon: Users, permission: 'users.view' },
    {
      to: '/settings/application',
      label: 'Application Preferences',
      icon: Sliders,
      permission: 'settings.view',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Settings Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-surface-800 pb-3">
        {navLinks
          .filter((link) => !link.permission || hasPermission(link.permission))
          .map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800/60'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
      </div>

      <Outlet />
    </div>
  );
};
