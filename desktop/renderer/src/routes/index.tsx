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
import { DataManagementPage } from '../pages/settings/DataManagementPage';
import { ProductsIndexPage } from '../pages/products/ProductsIndexPage';
import { InventoryIndexPage } from '../pages/inventory/InventoryIndexPage';
import { PurchasesIndexPage } from '../pages/purchases/PurchasesIndexPage';
import { SuppliersIndexPage } from '../pages/suppliers/SuppliersIndexPage';
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
            <Route
              path="data"
              element={
                <PermissionGuard
                  permission="settings.view"
                  fallback={<AccessDeniedFallback moduleName="Data & Demo Management" />}
                >
                  <DataManagementPage />
                </PermissionGuard>
              }
            />
          </Route>

          {/* Product Master Module */}
          <Route
            path="/products/*"
            element={
              <PermissionGuard
                permission="products.view"
                fallback={<AccessDeniedFallback moduleName="Product Master" />}
              >
                <ProductsIndexPage />
              </PermissionGuard>
            }
          />

          <Route
            path="/purchase/*"
            element={
              <PermissionGuard
                permission="purchase.view"
                fallback={<AccessDeniedFallback moduleName="Purchase & Procurement" />}
              >
                <PurchasesIndexPage />
              </PermissionGuard>
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

          {/* Inventory & Stock Control Module */}
          <Route
            path="/inventory/*"
            element={
              <PermissionGuard
                permission="inventory.view"
                fallback={<AccessDeniedFallback moduleName="Stock & Inventory Control" />}
              >
                <InventoryIndexPage />
              </PermissionGuard>
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
            path="/suppliers/*"
            element={
              <PermissionGuard
                permission="suppliers.view"
                fallback={<AccessDeniedFallback moduleName="Supplier Directory & Payables" />}
              >
                <SuppliersIndexPage />
              </PermissionGuard>
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
