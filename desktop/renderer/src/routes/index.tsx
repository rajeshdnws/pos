import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PermissionGuard } from '../components/PermissionGuard';
import { DashboardPage } from '../pages/DashboardPage';
import { SetupWizardPage } from '../pages/SetupWizardPage';
import { LoginPage } from '../pages/LoginPage';
import { ComingSoonPage } from '../pages/ComingSoonPage';
import { SettingsIndexPage } from '../pages/settings/SettingsIndexPage';
import { UserProfilePage } from '../pages/settings/UserProfilePage';
import { BusinessProfilePage } from '../pages/settings/BusinessProfilePage';
import { UserManagementPage } from '../pages/settings/UserManagementPage';
import { ApplicationSettingsPage } from '../pages/settings/ApplicationSettingsPage';
import { useAuthStore } from '../store/authStore';
import { ShieldAlert, Loader2 } from 'lucide-react';

const SetupRoute: React.FC = () => {
  const { isSetup, isLoading, isAuthenticated } = useAuthStore();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <span className="text-xs font-medium tracking-wide">Checking configuration...</span>
      </div>
    );
  }
  if (isSetup) {
    return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
  }
  return <SetupWizardPage />;
};

const LoginRoute: React.FC = () => {
  const { isSetup, isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <span className="text-xs font-medium tracking-wide">Checking session...</span>
      </div>
    );
  }
  if (!isSetup) {
    return <Navigate to="/setup" replace />;
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <LoginPage />;
};

const AccessDeniedFallback: React.FC<{ moduleName: string }> = ({ moduleName }) => (
  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-8 text-center space-y-3">
    <ShieldAlert className="h-10 w-10 text-rose-400 mx-auto" />
    <h3 className="text-base font-semibold text-white">Access Denied</h3>
    <p className="text-xs text-slate-400 max-w-sm mx-auto">
      You do not have the required permissions to access {moduleName}. Contact your system
      administrator.
    </p>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public / Auth Routes */}
      <Route path="/setup" element={<SetupRoute />} />
      <Route path="/login" element={<LoginRoute />} />

      {/* Protected Desktop Application Shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Settings Section with Tabs */}
          <Route path="/settings" element={<SettingsIndexPage />}>
            <Route index element={<Navigate to="/settings/profile" replace />} />
            <Route path="profile" element={<UserProfilePage />} />
            <Route
              path="business"
              element={
                <PermissionGuard
                  permission="settings.view"
                  fallback={<AccessDeniedFallback moduleName="Business Profile Settings" />}
                >
                  <BusinessProfilePage />
                </PermissionGuard>
              }
            />
            <Route
              path="users"
              element={
                <PermissionGuard
                  permission="users.view"
                  fallback={<AccessDeniedFallback moduleName="User & Role Management" />}
                >
                  <UserManagementPage />
                </PermissionGuard>
              }
            />
            <Route
              path="application"
              element={
                <PermissionGuard
                  permission="settings.view"
                  fallback={<AccessDeniedFallback moduleName="Application Preferences" />}
                >
                  <ApplicationSettingsPage />
                </PermissionGuard>
              }
            />
          </Route>

          {/* Placeholder Business Modules (Upcoming Steps) */}
          <Route
            path="/products"
            element={
              <ComingSoonPage
                moduleName="Product & Catalog Management"
                description="Manage inventory items, barcodes, SKUs, HSN codes, cost & selling prices, and unit conversions."
                plannedFeatures={[
                  'Barcode & SKU scanning support',
                  'HSN code categorization & GST rates',
                  'Low stock threshold alerts',
                  'Multiple units (Kg, Pcs, Box, Ltr)',
                ]}
              />
            }
          />

          <Route
            path="/purchase"
            element={
              <ComingSoonPage
                moduleName="Purchase & Procurement"
                description="Manage supplier purchase orders, inbound invoices, cost tracking, and purchase returns."
                plannedFeatures={[
                  'Purchase invoice entry with GST breakdown',
                  'Automated stock increment transactions',
                  'Supplier bill reconciliation',
                  'Purchase debit notes / returns',
                ]}
              />
            }
          />

          <Route
            path="/sales"
            element={
              <ComingSoonPage
                moduleName="Billing & Point of Sale (POS)"
                description="High-speed barcode billing, invoice generation, GST tax computation, and receipt printing."
                plannedFeatures={[
                  'Keyboard-optimized POS checkout interface',
                  'Thermal 58mm/80mm instant receipt printing',
                  'Split payments (Cash, UPI, Card, Credit)',
                  'Sales returns & credit note generation',
                ]}
              />
            }
          />

          <Route
            path="/inventory"
            element={
              <ComingSoonPage
                moduleName="Stock & Inventory Control"
                description="Real-time stock valuation, inventory auditing, physical adjustments, and movement history."
                plannedFeatures={[
                  'Transactional stock movements auditing',
                  'Damage & wastage stock adjustments',
                  'Stock transfer & opening balance entry',
                  'Dead stock & fast-moving analysis',
                ]}
              />
            }
          />

          <Route
            path="/customers"
            element={
              <ComingSoonPage
                moduleName="Customer & Khata Ledger"
                description="Track retail customer profiles, credit limits, outstanding balances, and khata ledger."
                plannedFeatures={[
                  'Credit customer khata ledger tracking',
                  'Payment receipts (Cash / UPI) recording',
                  'Payment reminder SMS / WhatsApp ready',
                  'Customer transaction history',
                ]}
              />
            }
          />

          <Route
            path="/suppliers"
            element={
              <ComingSoonPage
                moduleName="Supplier Directory & Payables"
                description="Maintain vendor contact info, GSTINs, purchase history, and payment ledger."
                plannedFeatures={[
                  'Supplier payables tracking',
                  'Outgoing payment vouchers recording',
                  'Supplier statement reconciliation',
                  'TDS & GST purchase compliance',
                ]}
              />
            }
          />

          <Route
            path="/reports"
            element={
              <ComingSoonPage
                moduleName="Business Analytics & GST Reports"
                description="Comprehensive sales, purchase, stock valuation, and GST GSTR-1 / GSTR-3B export reports."
                plannedFeatures={[
                  'Daily sales & profit margins overview',
                  'GSTR-1 B2B / B2C invoice export',
                  'Current inventory valuation report',
                  'Cash flow and expense summary',
                ]}
              />
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
};
