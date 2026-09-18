export interface SystemPermissionDef {
  code: string;
  name: string;
  description: string;
  module: string;
}

export const SYSTEM_PERMISSIONS: SystemPermissionDef[] = [
  // Dashboard
  {
    code: 'dashboard.view',
    name: 'View Dashboard',
    description: 'Access main dashboard overview',
    module: 'Dashboard',
  },

  // Products
  {
    code: 'products.view',
    name: 'View Products',
    description: 'Browse and search product catalog',
    module: 'Products',
  },
  {
    code: 'products.create',
    name: 'Create Product',
    description: 'Add new items to catalog',
    module: 'Products',
  },
  {
    code: 'products.edit',
    name: 'Edit Product',
    description: 'Update product information and prices',
    module: 'Products',
  },
  {
    code: 'products.delete',
    name: 'Delete Product',
    description: 'Remove products from catalog',
    module: 'Products',
  },

  // Inventory
  {
    code: 'inventory.view',
    name: 'View Inventory',
    description: 'View stock levels and movements',
    module: 'Inventory',
  },
  {
    code: 'inventory.adjust',
    name: 'Adjust Stock',
    description: 'Perform manual stock adjustments',
    module: 'Inventory',
  },

  // Purchase
  {
    code: 'purchase.view',
    name: 'View Purchases',
    description: 'View purchase invoices and orders',
    module: 'Purchase',
  },
  {
    code: 'purchase.create',
    name: 'Create Purchase',
    description: 'Record vendor purchase bills',
    module: 'Purchase',
  },
  {
    code: 'purchase.edit',
    name: 'Edit Purchase',
    description: 'Modify purchase records',
    module: 'Purchase',
  },
  {
    code: 'purchase.delete',
    name: 'Delete Purchase',
    description: 'Cancel or delete purchases',
    module: 'Purchase',
  },

  // Sales
  {
    code: 'sales.view',
    name: 'View Sales',
    description: 'Browse invoices and POS records',
    module: 'Sales',
  },
  {
    code: 'sales.create',
    name: 'Create Sales Invoice',
    description: 'Issue POS invoices and bills',
    module: 'Sales',
  },
  {
    code: 'sales.edit',
    name: 'Edit Sales Invoice',
    description: 'Modify sales invoices',
    module: 'Sales',
  },
  {
    code: 'sales.delete',
    name: 'Delete Sales Invoice',
    description: 'Void or delete sales invoices',
    module: 'Sales',
  },

  // Customers
  {
    code: 'customers.view',
    name: 'View Customers',
    description: 'Access customer directory and ledger',
    module: 'Customers',
  },
  {
    code: 'customers.create',
    name: 'Create Customer',
    description: 'Add new customers',
    module: 'Customers',
  },
  {
    code: 'customers.edit',
    name: 'Edit Customer',
    description: 'Update customer profiles',
    module: 'Customers',
  },
  {
    code: 'customers.delete',
    name: 'Delete Customer',
    description: 'Delete customer accounts',
    module: 'Customers',
  },

  // Suppliers
  {
    code: 'suppliers.view',
    name: 'View Suppliers',
    description: 'Access vendor directory and ledger',
    module: 'Suppliers',
  },
  {
    code: 'suppliers.create',
    name: 'Create Supplier',
    description: 'Add new vendors',
    module: 'Suppliers',
  },
  {
    code: 'suppliers.edit',
    name: 'Edit Supplier',
    description: 'Update vendor records',
    module: 'Suppliers',
  },
  {
    code: 'suppliers.delete',
    name: 'Delete Supplier',
    description: 'Remove suppliers',
    module: 'Suppliers',
  },

  // Reports
  {
    code: 'reports.view',
    name: 'View Reports',
    description: 'Generate sales, GST, and profit reports',
    module: 'Reports',
  },

  // Settings
  {
    code: 'settings.view',
    name: 'View Settings',
    description: 'View company and system configuration',
    module: 'Settings',
  },
  {
    code: 'settings.edit',
    name: 'Edit Settings',
    description: 'Modify business profile and hardware settings',
    module: 'Settings',
  },

  // Users
  {
    code: 'users.view',
    name: 'View Users',
    description: 'List employee accounts and roles',
    module: 'Users',
  },
  {
    code: 'users.create',
    name: 'Create User',
    description: 'Create new user accounts',
    module: 'Users',
  },
  {
    code: 'users.edit',
    name: 'Edit User',
    description: 'Modify user profiles and roles',
    module: 'Users',
  },
  {
    code: 'users.delete',
    name: 'Deactivate User',
    description: 'Deactivate or reset user accounts',
    module: 'Users',
  },

  // Backup & Audit
  {
    code: 'backup.create',
    name: 'Create Backup',
    description: 'Generate local database backups',
    module: 'Backup',
  },
  {
    code: 'backup.restore',
    name: 'Restore Backup',
    description: 'Restore database from backup',
    module: 'Backup',
  },
  {
    code: 'audit.view',
    name: 'View Audit Logs',
    description: 'Inspect system security and activity logs',
    module: 'Audit',
  },
];

export const ROLE_PERMISSION_MAP: Record<'ADMINISTRATOR' | 'MANAGER' | 'CASHIER', string[]> = {
  ADMINISTRATOR: SYSTEM_PERMISSIONS.map((p) => p.code),

  MANAGER: [
    'dashboard.view',
    'products.view',
    'products.create',
    'products.edit',
    'inventory.view',
    'inventory.adjust',
    'purchase.view',
    'purchase.create',
    'purchase.edit',
    'purchase.delete',
    'sales.view',
    'sales.create',
    'sales.edit',
    'customers.view',
    'customers.create',
    'customers.edit',
    'suppliers.view',
    'suppliers.create',
    'suppliers.edit',
    'reports.view',
  ],

  CASHIER: [
    'dashboard.view',
    'products.view',
    'sales.view',
    'sales.create',
    'customers.view',
    'customers.create',
    'customers.edit',
  ],
};

export const SYSTEM_ROLES: Record<string, string[]> = {
  ...ROLE_PERMISSION_MAP,
  ADMIN: ROLE_PERMISSION_MAP.ADMINISTRATOR,
};

export class PermissionService {
  /**
   * Checks if a user possessing userPermissions is authorized for a specific permission code.
   */
  public static can(userPermissions: string[] | undefined, requiredPermission: string): boolean {
    if (!userPermissions || !Array.isArray(userPermissions)) {
      return false;
    }
    return userPermissions.includes(requiredPermission);
  }

  /**
   * Returns all default permissions for a system role.
   */
  public static getPermissionsForRole(roleName: string): string[] {
    const key = roleName.toUpperCase() as keyof typeof ROLE_PERMISSION_MAP;
    return ROLE_PERMISSION_MAP[key] || [];
  }
}
