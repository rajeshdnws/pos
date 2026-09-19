/**
 * RS Inventory - Solo Product Licensing & Edition Types
 * Company: RS ORANGE TECH PVT LTD
 */

export type ProductEdition = 'SOLO' | 'LAN' | 'BUSINESS';

export type LicenseType = 'PERPETUAL' | 'SUBSCRIPTION' | 'TRIAL' | 'EVALUATION';

export type LicenseStatus =
  | 'NOT_ACTIVATED'
  | 'VALID'
  | 'TRIAL'
  | 'EXPIRED'
  | 'NOT_YET_VALID'
  | 'INVALID_SIGNATURE'
  | 'INVALID_LICENSE'
  | 'UNSUPPORTED_VERSION'
  | 'EDITION_MISMATCH'
  | 'DEVICE_MISMATCH'
  | 'DEACTIVATED';

export type FeatureCode =
  | 'inventory.core'
  | 'sales.core'
  | 'purchases.core'
  | 'reports.basic'
  | 'reports.advanced'
  | 'users.multiple'
  | 'locations.multiple'
  | 'settings.advanced'
  | 'lan.sync'
  | 'business.multi_branch';

export interface LicensePayload {
  licenseSchemaVersion: number;
  licenseId: string;
  productId: string; // 'RS_INVENTORY'
  productName: string; // 'RS Inventory'
  edition: ProductEdition;
  licenseType: LicenseType;
  customerId?: string;
  customerName: string;
  issuedAt: string; // ISO-8601
  validFrom: string; // ISO-8601
  expiresAt: string | null; // ISO-8601 or null for perpetual
  updateEntitlementUntil?: string | null;
  supportEntitlementUntil?: string | null;
  licensedFeatures: FeatureCode[];
  maximumUsers?: number;
  maximumDevices?: number;
  installationId?: string | null; // Bound machine ID or null for unbound
}

export interface SignedLicense {
  payload: LicensePayload;
  signatureAlgorithm: 'RSA-SHA256' | 'Ed25519';
  signature: string; // Base64
}

export interface ActivationRequestDTO {
  productId: string;
  edition: ProductEdition;
  installationId: string;
  hostname: string;
  platform: string;
  arch: string;
  appVersion: string;
  requestedAt: string; // ISO-8601
  customerName?: string;
}

export interface FeatureEntitlementInfo {
  code: FeatureCode;
  name: string;
  description: string;
  enabled: boolean;
}

export interface LicenseStatusDTO {
  status: LicenseStatus;
  edition: ProductEdition;
  licenseType?: LicenseType;
  licenseId?: string;
  customerName?: string;
  installationId: string;
  isBoundToDevice: boolean;
  issuedAt?: string;
  validFrom?: string;
  expiresAt?: string | null;
  daysRemaining?: number | null;
  isTrial: boolean;
  isExpired: boolean;
  updateEntitlementUntil?: string | null;
  supportEntitlementUntil?: string | null;
  licensedFeatures: FeatureCode[];
  features: FeatureEntitlementInfo[];
  message: string;
}

export interface LicenseValidationResult {
  isValid: boolean;
  status: LicenseStatus;
  message: string;
  payload?: LicensePayload;
}
