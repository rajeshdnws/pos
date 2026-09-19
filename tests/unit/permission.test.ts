import { describe, it, expect } from 'vitest';
import {
  PermissionService,
  SYSTEM_PERMISSIONS,
  SYSTEM_ROLES,
} from '../../packages/business/src/services/permission.service';

describe('PermissionService & RBAC Unit Tests', () => {
  it('should define system permissions across modules including products, categories, units, and brands', () => {
    expect(SYSTEM_PERMISSIONS.length).toBe(54);

    const codes = SYSTEM_PERMISSIONS.map((p) => p.code);
    expect(codes).toContain('users.create');
    expect(codes).toContain('users.view');
    expect(codes).toContain('products.view');
    expect(codes).toContain('products.create');
    expect(codes).toContain('categories.view');
    expect(codes).toContain('units.view');
    expect(codes).toContain('brands.view');
    expect(codes).toContain('settings.view');
    expect(codes).toContain('sales.create');
    expect(codes).toContain('reports.view');
    expect(codes).toContain('inventory.view');
    expect(codes).toContain('inventory.adjust');
    expect(codes).toContain('inventory.stocktake');
    expect(codes).toContain('inventory.reconcile');
    expect(codes).toContain('inventory.manage_locations');
    expect(codes).toContain('inventory.transfer');
  });

  it('should grant Administrator all system permissions', () => {
    const adminPerms = SYSTEM_ROLES['ADMIN']!;
    expect(adminPerms).toBeDefined();
    expect(adminPerms.length).toBe(54);

    // Administrator should have all permissions defined in the system
    SYSTEM_PERMISSIONS.forEach((perm) => {
      expect(adminPerms).toContain(perm.code);
    });
  });

  it('should grant Manager operational permissions including catalog masters and exclude system-level admin tasks', () => {
    const managerPerms = SYSTEM_ROLES['MANAGER']!;
    expect(managerPerms).toBeDefined();
    expect(managerPerms.length).toBe(38);

    // Manager cannot manage users or system settings
    expect(managerPerms).not.toContain('users.view');
    expect(managerPerms).not.toContain('users.create');
    expect(managerPerms).not.toContain('users.edit');
    expect(managerPerms).not.toContain('users.delete');

    expect(managerPerms).not.toContain('settings.view');
    expect(managerPerms).not.toContain('settings.edit');
    expect(managerPerms).not.toContain('products.delete');
    expect(managerPerms).not.toContain('sales.delete');

    // Manager can view reports and manage operational transactions
    expect(managerPerms).toContain('sales.create');
    expect(managerPerms).toContain('purchase.create');
    expect(managerPerms).toContain('reports.view');
  });

  it('should grant Cashier 7 POS and billing permissions only', () => {
    const cashierPerms = SYSTEM_ROLES['CASHIER']!;
    expect(cashierPerms).toBeDefined();
    expect(cashierPerms.length).toBe(7);

    expect(cashierPerms).toContain('dashboard.view');
    expect(cashierPerms).toContain('sales.view');
    expect(cashierPerms).toContain('sales.create');
    expect(cashierPerms).toContain('products.view');
    expect(cashierPerms).toContain('customers.view');
    expect(cashierPerms).toContain('customers.create');
    expect(cashierPerms).toContain('customers.edit');

    // Cashier must NOT have purchase, reports, settings, or user management permissions
    expect(cashierPerms).not.toContain('purchase.view');
    expect(cashierPerms).not.toContain('reports.view');
    expect(cashierPerms).not.toContain('settings.view');
    expect(cashierPerms).not.toContain('users.view');
  });

  it('should evaluate user permissions accurately via PermissionService.can', () => {
    const cashierPerms = SYSTEM_ROLES['CASHIER']!;
    const adminPerms = SYSTEM_ROLES['ADMIN']!;

    expect(PermissionService.can(cashierPerms, 'sales.create')).toBe(true);
    expect(PermissionService.can(cashierPerms, 'reports.view')).toBe(false);
    expect(PermissionService.can(cashierPerms, 'users.delete')).toBe(false);

    expect(PermissionService.can(adminPerms, 'reports.view')).toBe(true);
    expect(PermissionService.can(adminPerms, 'settings.edit')).toBe(true);
  });
});
