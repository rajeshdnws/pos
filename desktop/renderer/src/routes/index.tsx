import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PermissionGuard } from '../components/PermissionGuard';
import { DashboardPage } from '../pages/DashboardPage';
import { SetupWizardPage } from '../pages/SetupWizardPage';
import { LoginPage } from '../pages/LoginPage';
import { SettingsIndexPage } from '../pages/settings/SettingsIndexPage';
import { UserProfilePage } from '../pages/settings/UserProfilePage';
import { BusinessProfilePage } from '../pages/settings/BusinessProfilePage';
import { InvoiceSettingsPage } from '../pages/settings/InvoiceSettingsPage';
import { CurrencySettingsPage } from '../pages/settings/CurrencySettingsPage';
import { TaxPricingSettingsPage } from '../pages/settings/TaxPricingSettingsPage';
import { InventoryPreferencesPage } from '../pages/settings/InventoryPreferencesPage';
import { UserManagementPage } from '../pages/settings/UserManagementPage';
import { RolesPermissionsPage } from '../pages/settings/RolesPermissionsPage';
import { ApplicationSettingsPage } from '../pages/settings/ApplicationSettingsPage';
import { BackupRestorePage } from '../pages/settings/BackupRestorePage';
import { SecurityAuditPage } from '../pages/settings/SecurityAuditPage';
import { AboutPage } from '../pages/settings/AboutPage';
import { DataManagementPage } from '../pages/settings/DataManagementPage';
import { LicenseActivationPage } from '../pages/settings/LicenseActivationPage';
import { LoyaltySettingsPage } from '../pages/settings/LoyaltySettingsPage';
import { ProductsIndexPage } from '../pages/products/ProductsIndexPage';
import { InventoryIndexPage } from '../pages/inventory/InventoryIndexPage';
import { PurchasesIndexPage } from '../pages/purchases/PurchasesIndexPage';
import { SuppliersIndexPage } from '../pages/suppliers/SuppliersIndexPage';
import { SalesIndexPage } from '../pages/sales/SalesIndexPage';
import { CustomersIndexPage } from '../pages/customers/CustomersIndexPage';
import { ExpensesIndexPage } from '../pages/expenses/ExpensesIndexPage';
import { CashRegisterIndexPage } from '../pages/cash-register/CashRegisterIndexPage';
import { ReportsIndexPage } from '../pages/reports/ReportsIndexPage';
import { PromotionsIndexPage } from '../pages/promotions/PromotionsIndexPage';
import { CommunicationIndexPage } from '../pages/communication/CommunicationIndexPage';
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
            <Route index element={<Navigate to="/settings/business" replace />} />
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
              path="license"
              element={
                <PermissionGuard
                  permission="settings.view"
                  fallback={<AccessDeniedFallback moduleName="Product Licensing & Activation" />}
                >
                  <LicenseActivationPage />
                </PermissionGuard>
              }
            />
            <Route
              path="loyalty"
              element={
                <PermissionGuard
                  permission="loyalty.view"
                  fallback={<AccessDeniedFallback moduleName="Customer Loyalty & Wallet" />}
                >
                  <LoyaltySettingsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="invoice"
              element={
                <PermissionGuard
                  permission="settings.view"
                  fallback={<AccessDeniedFallback moduleName="Invoice & Printing Preferences" />}
                >
                  <InvoiceSettingsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="currency"
              element={
                <PermissionGuard
                  permission="settings.view"
                  fallback={<AccessDeniedFallback moduleName="Currency & Number Formatting" />}
                >
                  <CurrencySettingsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="tax-pricing"
              element={
                <PermissionGuard
                  permission="settings.view"
                  fallback={<AccessDeniedFallback moduleName="Tax & Pricing Preferences" />}
                >
                  <TaxPricingSettingsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="inventory"
              element={
                <PermissionGuard
                  permission="settings.view"
                  fallback={<AccessDeniedFallback moduleName="Inventory & Stock Preferences" />}
                >
                  <InventoryPreferencesPage />
                </PermissionGuard>
              }
            />
            <Route
              path="users"
              element={
                <PermissionGuard
                  permission="users.view"
                  fallback={<AccessDeniedFallback moduleName="User Management" />}
                >
                  <UserManagementPage />
                </PermissionGuard>
              }
            />
            <Route
              path="roles"
              element={
                <PermissionGuard
                  permission="users.view"
                  fallback={<AccessDeniedFallback moduleName="Roles & Permissions Matrix" />}
                >
                  <RolesPermissionsPage />
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
              path="backup"
              element={
                <PermissionGuard
                  permission="settings.view"
                  fallback={<AccessDeniedFallback moduleName="Database Backup & Recovery" />}
                >
                  <BackupRestorePage />
                </PermissionGuard>
              }
            />
            <Route
              path="security-audit"
              element={
                <PermissionGuard
                  permission="settings.view"
                  fallback={<AccessDeniedFallback moduleName="Security, Session & Audit Logs" />}
                >
                  <SecurityAuditPage />
                </PermissionGuard>
              }
            />
            <Route path="about" element={<AboutPage />} />
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
            path="/sales/*"
            element={
              <PermissionGuard
                permission="sales.view"
                fallback={<AccessDeniedFallback moduleName="Sales & POS Billing" />}
              >
                <SalesIndexPage />
              </PermissionGuard>
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
            path="/customers/*"
            element={
              <PermissionGuard
                permission="customers.view"
                fallback={<AccessDeniedFallback moduleName="Customer Directory & Khata Ledger" />}
              >
                <CustomersIndexPage />
              </PermissionGuard>
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
            path="/expenses/*"
            element={
              <PermissionGuard
                permission="expense.view"
                fallback={<AccessDeniedFallback moduleName="Expenses & Cash Outflows" />}
              >
                <ExpensesIndexPage />
              </PermissionGuard>
            }
          />

          <Route
            path="/cash-register/*"
            element={
              <PermissionGuard
                permission="cashRegister.view"
                fallback={<AccessDeniedFallback moduleName="Cash Register & Day-End Closing" />}
              >
                <CashRegisterIndexPage />
              </PermissionGuard>
            }
          />

          <Route
            path="/promotions/*"
            element={
              <PermissionGuard
                permission="promotions.view"
                fallback={<AccessDeniedFallback moduleName="Promotions & Campaigns" />}
              >
                <PromotionsIndexPage />
              </PermissionGuard>
            }
          />

          <Route
            path="/communication/*"
            element={
              <PermissionGuard
                permission="communication.view"
                fallback={<AccessDeniedFallback moduleName="Communication & Messaging Settings" />}
              >
                <CommunicationIndexPage />
              </PermissionGuard>
            }
          />

          <Route
            path="/reports"
            element={
              <PermissionGuard
                permission="reports.view"
                fallback={<AccessDeniedFallback moduleName="Business Reports & Analytics" />}
              >
                <ReportsIndexPage />
              </PermissionGuard>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
};
