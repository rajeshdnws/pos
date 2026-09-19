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
    description: 'Deactivate product from catalog',
    module: 'Products',
  },
  {
    code: 'products.activate',
    name: 'Activate Product',
    description: 'Reactivate previously deactivated product',
    module: 'Products',
  },

  // Categories
  {
    code: 'categories.view',
    name: 'View Categories',
    description: 'View product category list',
    module: 'Categories',
  },
  {
    code: 'categories.create',
    name: 'Create Category',
    description: 'Create new product categories',
    module: 'Categories',
  },
  {
    code: 'categories.edit',
    name: 'Edit Category',
    description: 'Modify product categories',
    module: 'Categories',
  },
  {
    code: 'categories.delete',
    name: 'Deactivate Category',
    description: 'Deactivate product categories',
    module: 'Categories',
  },
  {
    code: 'categories.activate',
    name: 'Activate Category',
    description: 'Reactivate product categories',
    module: 'Categories',
  },

  // Units
  {
    code: 'units.view',
    name: 'View Units',
    description: 'View measurement units',
    module: 'Units',
  },
  {
    code: 'units.create',
    name: 'Create Unit',
    description: 'Create new measurement units',
    module: 'Units',
  },
  {
    code: 'units.edit',
    name: 'Edit Unit',
    description: 'Modify measurement units',
    module: 'Units',
  },
  {
    code: 'units.delete',
    name: 'Deactivate Unit',
    description: 'Deactivate measurement units',
    module: 'Units',
  },
  {
    code: 'units.activate',
    name: 'Activate Unit',
    description: 'Reactivate measurement units',
    module: 'Units',
  },

  // Brands
  {
    code: 'brands.view',
    name: 'View Brands',
    description: 'View manufacturer brands',
    module: 'Brands',
  },
  {
    code: 'brands.create',
    name: 'Create Brand',
    description: 'Create new manufacturer brands',
    module: 'Brands',
  },
  {
    code: 'brands.edit',
    name: 'Edit Brand',
    description: 'Modify manufacturer brands',
    module: 'Brands',
  },
  {
    code: 'brands.delete',
    name: 'Deactivate Brand',
    description: 'Deactivate manufacturer brands',
    module: 'Brands',
  },
  {
    code: 'brands.activate',
    name: 'Activate Brand',
    description: 'Reactivate manufacturer brands',
    module: 'Brands',
  },

  // Inventory
  {
    code: 'inventory.view',
    name: 'View Inventory',
    description: 'View current stock levels and alerts',
    module: 'Inventory',
  },
  {
    code: 'inventory.view_history',
    name: 'View Stock History',
    description: 'View full audit log of stock movements',
    module: 'Inventory',
  },
  {
    code: 'inventory.adjust',
    name: 'Adjust Stock',
    description: 'Perform manual stock increases or decreases',
    module: 'Inventory',
  },
  {
    code: 'inventory.stocktake',
    name: 'Physical Stocktake',
    description: 'Conduct physical inventory count sessions and post corrections',
    module: 'Inventory',
  },
  {
    code: 'inventory.reconcile',
    name: 'Reconcile Stock',
    description: 'Compare ledger vs balances and repair discrepancies',
    module: 'Inventory',
  },
  {
    code: 'inventory.manage_locations',
    name: 'Manage Storage Locations',
    description: 'Create and configure warehouses and storage locations',
    module: 'Inventory',
  },
  {
    code: 'inventory.transfer',
    name: 'Transfer Stock',
    description: 'Transfer stock between locations',
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
  // Step 7: Expenses
  {
    code: 'expense.view',
    name: 'View Expenses',
    description: 'Browse expense list and categories',
    module: 'Expenses',
  },
  {
    code: 'expense.create',
    name: 'Create Expense',
    description: 'Create expense drafts and vouchers',
    module: 'Expenses',
  },
  {
    code: 'expense.edit_draft',
    name: 'Edit Expense Draft',
    description: 'Modify draft expense vouchers',
    module: 'Expenses',
  },
  {
    code: 'expense.post',
    name: 'Post Expense',
    description: 'Post expenses to financial register and cashbook',
    module: 'Expenses',
  },
  {
    code: 'expense.cancel_draft',
    name: 'Cancel Expense Draft',
    description: 'Cancel unposted draft expenses',
    module: 'Expenses',
  },
  {
    code: 'expense.category.manage',
    name: 'Manage Expense Categories',
    description: 'Create and configure expense categories',
    module: 'Expenses',
  },

  // Step 7: Cash Register & Sessions
  {
    code: 'cashRegister.view',
    name: 'View Cash Register',
    description: 'View register status, active session, and cash drawer balance',
    module: 'Cash Register',
  },
  {
    code: 'cashRegister.manage',
    name: 'Manage Cash Registers',
    description: 'Add and configure cash registers',
    module: 'Cash Register',
  },
  {
    code: 'cashRegister.open',
    name: 'Open Register Session',
    description: 'Open new cashier session with starting cash',
    module: 'Cash Register',
  },
  {
    code: 'cashRegister.close',
    name: 'Close Register Session',
    description: 'Close register session and count drawer cash',
    module: 'Cash Register',
  },
  {
    code: 'cashRegister.cashIn',
    name: 'Record Cash In',
    description: 'Record cash float additions into register',
    module: 'Cash Register',
  },
  {
    code: 'cashRegister.cashOut',
    name: 'Record Cash Out',
    description: 'Record cash payouts and withdrawals from register',
    module: 'Cash Register',
  },
  {
    code: 'cashRegister.adjust',
    name: 'Adjust Cash Register',
    description: 'Record authorized cash adjustments',
    module: 'Cash Register',
  },
  {
    code: 'cashRegister.reopen',
    name: 'Reopen Closed Session',
    description: 'Reopen previously closed session with audit justification',
    module: 'Cash Register',
  },

  // Step 7: Cashbook
  {
    code: 'cashbook.view',
    name: 'View Cashbook',
    description: 'Access chronological cash movement ledger',
    module: 'Cashbook',
  },
  {
    code: 'cashbook.export',
    name: 'Export Cashbook',
    description: 'Export cashbook ledger to CSV or spreadsheet',
    module: 'Cashbook',
  },

  // Step 7: Day-End Closing
  {
    code: 'dayEndClosing.view',
    name: 'View Day-End Closing',
    description: 'View daily closing summaries and reports',
    module: 'Day-End Closing',
  },
  {
    code: 'dayEndClosing.close',
    name: 'Perform Day-End Closing',
    description: 'Reconcile counted cash and finalize business day',
    module: 'Day-End Closing',
  },
  {
    code: 'dayEndClosing.approve_difference',
    name: 'Approve Closing Discrepancy',
    description: 'Approve closing with cash variance or discrepancy',
    module: 'Day-End Closing',
  },
  {
    code: 'dayEndClosing.reopen',
    name: 'Reopen Day Closing',
    description: 'Reopen completed day-end closing snapshot',
    module: 'Day-End Closing',
  },
  // Step 9: Granular Permissions
  {
    code: 'products.view_cost',
    name: 'View Product Cost',
    description: 'See purchase cost and profit margins on products',
    module: 'Products',
  },
  {
    code: 'products.change_price',
    name: 'Change Product Price',
    description: 'Modify product selling prices and MRPs',
    module: 'Products',
  },
  {
    code: 'inventory.view_valuation',
    name: 'View Inventory Valuation',
    description: 'Inspect total financial valuation of stock on hand',
    module: 'Inventory',
  },
  {
    code: 'sales.override_price',
    name: 'Override Item Selling Price',
    description: 'Modify item rate during checkout or sales creation',
    module: 'Sales',
  },
  {
    code: 'sales.apply_discount',
    name: 'Apply Invoice Discount',
    description: 'Grant line-level and bill-level discounts',
    module: 'Sales',
  },
  {
    code: 'purchase.record_payment',
    name: 'Record Supplier Payment',
    description: 'Disburse supplier payments and record payment vouchers',
    module: 'Purchase',
  },
  {
    code: 'customers.view_balance',
    name: 'View Customer Balance',
    description: 'See customer receivables balance and aging ledger',
    module: 'Customers',
  },
  {
    code: 'suppliers.view_balance',
    name: 'View Supplier Balance',
    description: 'See vendor payables balance and aging ledger',
    module: 'Suppliers',
  },
  {
    code: 'settings.invoice',
    name: 'Manage Invoice Settings',
    description: 'Configure invoice numbering, prefixes, and print layout',
    module: 'Settings',
  },
  {
    code: 'settings.tax_pricing',
    name: 'Manage Tax & Pricing Settings',
    description: 'Configure default tax rates and pricing preferences',
    module: 'Settings',
  },
  {
    code: 'users.manage_roles',
    name: 'Manage Roles & Permissions',
    description: 'Create roles and configure role-permission assignments',
    module: 'Users',
  },
];

export const ROLE_PERMISSION_MAP: Record<
  'ADMINISTRATOR' | 'MANAGER' | 'CASHIER' | 'INVENTORY_OPERATOR' | 'ACCOUNTANT',
  string[]
> = {
  ADMINISTRATOR: SYSTEM_PERMISSIONS.map((p) => p.code),

  MANAGER: [
    'dashboard.view',
    'products.view',
    'products.create',
    'products.edit',
    'products.activate',
    'products.view_cost',
    'products.change_price',
    'categories.view',
    'categories.create',
    'categories.edit',
    'categories.activate',
    'units.view',
    'units.create',
    'units.edit',
    'units.activate',
    'brands.view',
    'brands.create',
    'brands.edit',
    'brands.activate',
    'inventory.view',
    'inventory.view_history',
    'inventory.view_valuation',
    'inventory.adjust',
    'inventory.stocktake',
    'inventory.reconcile',
    'inventory.manage_locations',
    'inventory.transfer',
    'purchase.view',
    'purchase.create',
    'purchase.edit',
    'purchase.delete',
    'purchase.record_payment',
    'sales.view',
    'sales.create',
    'sales.edit',
    'sales.override_price',
    'sales.apply_discount',
    'customers.view',
    'customers.create',
    'customers.edit',
    'customers.view_balance',
    'suppliers.view',
    'suppliers.create',
    'suppliers.edit',
    'suppliers.view_balance',
    'reports.view',
    'expense.view',
    'expense.create',
    'expense.edit_draft',
    'expense.post',
    'expense.cancel_draft',
    'expense.category.manage',
    'cashRegister.view',
    'cashRegister.manage',
    'cashRegister.open',
    'cashRegister.close',
    'cashRegister.cashIn',
    'cashRegister.cashOut',
    'cashRegister.adjust',
    'cashRegister.reopen',
    'cashbook.view',
    'cashbook.export',
    'dayEndClosing.view',
    'dayEndClosing.close',
    'dayEndClosing.approve_difference',
  ],

  CASHIER: [
    'dashboard.view',
    'products.view',
    'sales.view',
    'sales.create',
    'customers.view',
    'customers.create',
    'customers.edit',
    'expense.view',
    'expense.create',
    'cashRegister.view',
    'cashRegister.open',
    'cashRegister.close',
    'cashRegister.cashIn',
    'cashRegister.cashOut',
    'cashbook.view',
    'dayEndClosing.view',
    'dayEndClosing.close',
  ],

  INVENTORY_OPERATOR: [
    'dashboard.view',
    'products.view',
    'products.create',
    'products.edit',
    'products.activate',
    'categories.view',
    'categories.create',
    'categories.edit',
    'categories.activate',
    'units.view',
    'units.create',
    'units.edit',
    'units.activate',
    'brands.view',
    'brands.create',
    'brands.edit',
    'brands.activate',
    'inventory.view',
    'inventory.view_history',
    'inventory.adjust',
    'inventory.stocktake',
    'inventory.reconcile',
    'inventory.manage_locations',
    'inventory.transfer',
    'reports.view',
  ],

  ACCOUNTANT: [
    'dashboard.view',
    'purchase.view',
    'purchase.create',
    'purchase.edit',
    'purchase.record_payment',
    'sales.view',
    'customers.view',
    'customers.view_balance',
    'suppliers.view',
    'suppliers.view_balance',
    'expense.view',
    'expense.create',
    'expense.edit_draft',
    'expense.post',
    'expense.category.manage',
    'cashbook.view',
    'cashbook.export',
    'dayEndClosing.view',
    'dayEndClosing.close',
    'dayEndClosing.approve_difference',
    'reports.view',
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
