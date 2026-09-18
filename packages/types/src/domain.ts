import { BaseEntity } from './common.js';

export interface Company extends BaseEntity {
  name: string;
  businessName: string;
  businessType?: string | null;
  ownerName?: string | null;
  mobile?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country: string;
  gstRegistered: boolean;
  gstin?: string | null;
  pan?: string | null;
  taxType: string;
  invoicePrefix: string;
  startingInvoiceNumber: number;
  financialYearStart?: Date | string | null;
  financialYearEnd?: Date | string | null;
  logoPath?: string | null;
  currency: string;
  isActive: boolean;
}

export interface Role extends BaseEntity {
  name: string;
  description?: string | null;
  isSystemRole: boolean;
  permissions?: Permission[];
}

export interface Permission extends BaseEntity {
  code: string;
  name: string;
  description?: string | null;
  module: string;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: Date | string;
}

export interface User extends BaseEntity {
  companyId: string;
  username: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  roleId?: string | null;
  role?: Role | null;
  isActive: boolean;
  lastLoginAt?: Date | string | null;
  failedLoginAttempts?: number;
  lockedUntil?: Date | string | null;
}

export interface Setting extends BaseEntity {
  companyId: string;
  key: string;
  value: string;
  type: string;
}

export interface AuditLog {
  id: string;
  companyId: string;
  userId?: string | null;
  action: string;
  module: string;
  referenceId?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
  createdAt: Date | string;
  user?: {
    name: string;
    username: string;
  } | null;
}

export interface Category extends BaseEntity {
  companyId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface Unit extends BaseEntity {
  companyId: string;
  name: string;
  shortCode: string;
  allowDecimals: boolean;
}

export interface Product extends BaseEntity {
  companyId: string;
  categoryId?: string | null;
  unitId?: string | null;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  hsnCode?: string | null;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  minStockLevel: number;
  currentStock: number;
  isActive: boolean;
}

export interface Customer extends BaseEntity {
  companyId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  creditLimit: number;
  currentBalance: number;
  isActive: boolean;
}

export interface Supplier extends BaseEntity {
  companyId: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  currentBalance: number;
  isActive: boolean;
}

export type StockMovementType =
  'PURCHASE' | 'SALE' | 'PURCHASE_RETURN' | 'SALE_RETURN' | 'ADJUSTMENT' | 'OPENING_STOCK';

export interface StockMovement extends BaseEntity {
  companyId: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  unitPrice: number;
  referenceId?: string | null;
  notes?: string | null;
}

// ----------------- DTOs -----------------

export interface CompanySetupDTO {
  businessName: string;
  businessType?: string;
  ownerName?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  gstRegistered: boolean;
  gstin?: string;
  pan?: string;
  taxType?: string;
  invoicePrefix?: string;
  startingInvoiceNumber?: number;
  financialYearStart?: string;
  financialYearEnd?: string;
  adminFullName: string;
  adminUsername: string;
  adminMobile?: string;
  adminEmail?: string;
  adminPassword: string;
}

export interface LoginRequestDTO {
  username: string;
  password: string;
}

export interface LoginResponseDTO {
  user: User;
  sessionToken: string;
  permissions: string[];
  company: Company;
}

export interface UserCreateDTO {
  name: string;
  username: string;
  email?: string;
  mobile?: string;
  roleId: string;
  password: string;
  isActive?: boolean;
}

export interface UserUpdateDTO {
  name?: string;
  email?: string;
  mobile?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordDTO {
  userId: string;
  newPassword: string;
}
