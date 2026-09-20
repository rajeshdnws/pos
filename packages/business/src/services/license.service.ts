/**
 * RS Inventory - Solo License Service
 * Company: RS ORANGE TECH PVT LTD
 * 
 * Provides license verification, cryptographic entitlement evaluation,
 * device binding verification, and non-destructive access control.
 */

import { PrismaClient } from '@rs-inventory/database';
import {
  FeatureCode,
  FeatureEntitlementInfo,
  LicensePayload,
  LicenseStatus,
  LicenseStatusDTO,
  LicenseValidationResult,
  SignedLicense,
} from '@rs-inventory/types';
import { BusinessRuleError, ValidationError } from '../errors/app.error.js';

export const ALL_FEATURE_DEFINITIONS: FeatureEntitlementInfo[] = [
  {
    code: 'inventory.core',
    name: 'Core Inventory Master',
    description: 'Products, Barcodes, Categories, Units, Brands, and Stock Tracking',
    enabled: true,
  },
  {
    code: 'sales.core',
    name: 'POS Billing & Sales Invoices',
    description: 'Point-of-Sale terminal checkout, customer invoicing, and sales returns',
    enabled: true,
  },
  {
    code: 'purchases.core',
    name: 'Purchases & Inward Stock',
    description: 'Purchase orders, inward stock bills, and supplier payments',
    enabled: true,
  },
  {
    code: 'reports.basic',
    name: 'Basic Reports & Ledgers',
    description: 'Day-end closing, cashbook, customer and supplier outstanding ledgers',
    enabled: true,
  },
  {
    code: 'reports.advanced',
    name: 'Advanced Financial Analytics',
    description: 'Profit & Loss, inventory valuation, stock movements, and tax summaries',
    enabled: true,
  },
  {
    code: 'settings.advanced',
    name: 'System Settings & Backups',
    description: 'Hardware printer setup, company configuration, audit logs, backup and restore',
    enabled: true,
  },
  {
    code: 'users.multiple',
    name: 'Multi-User Staff Management',
    description: 'Multiple simultaneous cashier accounts with granular role permissions (LAN/Business)',
    enabled: false,
  },
  {
    code: 'locations.multiple',
    name: 'Multi-Location Warehouses',
    description: 'Multiple branch warehouses and inter-store stock transfers (LAN/Business)',
    enabled: false,
  },
  {
    code: 'lan.sync',
    name: 'LAN Multi-Terminal Sync',
    description: 'Real-time multi-counter synchronization over local area network (LAN/Business)',
    enabled: false,
  },
  {
    code: 'business.multi_branch',
    name: 'Multi-Branch Cloud Sync',
    description: 'Centralized HQ reporting and inter-branch cloud synchronization (Business)',
    enabled: false,
  },
];

/**
 * Deterministic canonical JSON serialization.
 * Recursively sorts keys alphabetically and discards undefined.
 */
export function canonicalize(val: any): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map((item) => canonicalize(item)).join(',') + ']';
  }
  const keys = Object.keys(val).sort();
  const pairs: string[] = [];
  for (const k of keys) {
    if (val[k] !== undefined) {
      pairs.push(`${JSON.stringify(k)}:${canonicalize(val[k])}`);
    }
  }
  return '{' + pairs.join(',') + '}';
}

function getNodeCrypto(): any {
  try {
    if (typeof process !== 'undefined' && process.versions?.node) {
      // typeof-guard avoids static analysis issues in both esbuild and Vite.
      // In the Electron main process (CJS bundle) require is always defined.
      // In the Vite renderer bundle the process.versions.node check above
      // will be false so this branch is never reached.
      const _req: NodeRequire | undefined =
        typeof require !== 'undefined' ? require : undefined;
      return _req ? _req('crypto') : null;
    }
  } catch {
    // In browser or mock environment
  }
  return null;
}

/**
 * Verify RSA-SHA256 signature against public key
 */
export function verifySignedLicense(license: SignedLicense, publicKeyPem: string): boolean {
  try {
    if (!license || !license.payload || !license.signature) {
      return false;
    }
    const cryptoModule = getNodeCrypto();
    if (!cryptoModule || typeof cryptoModule.createVerify !== 'function') {
      return false;
    }
    const canonicalString = canonicalize(license.payload);
    const verifier = cryptoModule.createVerify('SHA256');
    verifier.update(canonicalString, 'utf8');
    verifier.end();
    return verifier.verify(publicKeyPem, license.signature, 'base64');
  } catch {
    return false;
  }
}

export class LicenseService {
  private prisma: PrismaClient;
  private cachedStatus: LicenseStatusDTO | null = null;
  private currentInstallationId: string = 'RS-INST-SOLO-DEFAULT';
  private publicKeyPem: string = '';

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Configure environment parameters (called by Electron main process on boot)
   */
  public configure(installationId: string, publicKeyPem: string): void {
    this.currentInstallationId = installationId;
    this.publicKeyPem = publicKeyPem;
  }

  public getInstallationId(): string {
    return this.currentInstallationId;
  }

  /**
   * Query database and evaluate current license status
   */
  public async getLicenseStatus(): Promise<LicenseStatusDTO> {
    try {
      const activeLicense = await this.prisma.license.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      if (!activeLicense) {
        return this.buildUnlicensedStatus();
      }

      let payload: LicensePayload;
      try {
        payload = JSON.parse(activeLicense.licensePayload) as LicensePayload;
      } catch {
        return this.buildInvalidStatus('Corrupted license record stored in database.');
      }

      const signedLicense: SignedLicense = {
        payload,
        signatureAlgorithm: (activeLicense.signatureAlgorithm as 'RSA-SHA256') || 'RSA-SHA256',
        signature: activeLicense.signature,
      };

      const validation = this.validateLicense(signedLicense, this.currentInstallationId, this.publicKeyPem);
      const statusDTO = this.buildStatusDTO(validation.status, payload, validation.message);

      // Update last_validated_at in background
      this.prisma.license
        .update({
          where: { id: activeLicense.id },
          data: {
            lastValidatedAt: new Date(),
            activationStatus: validation.status,
          },
        })
        .catch(() => {});

      this.cachedStatus = statusDTO;
      return statusDTO;
    } catch (err) {
      return this.buildUnlicensedStatus();
    }
  }

  /**
   * Validate a signed license against hardware ID and public key
   */
  public validateLicense(
    license: SignedLicense,
    currentInstallationId: string,
    publicKeyPem: string
  ): LicenseValidationResult {
    if (!license || !license.payload) {
      return {
        isValid: false,
        status: 'INVALID_LICENSE',
        message: 'License payload is missing or unreadable.',
      };
    }

    const { payload } = license;

    // 1. Schema version check
    if (payload.licenseSchemaVersion !== 1) {
      return {
        isValid: false,
        status: 'UNSUPPORTED_VERSION',
        message: `Unsupported license schema version (${payload.licenseSchemaVersion}). Please update RS Inventory.`,
        payload,
      };
    }

    // 2. Product ID check
    if (payload.productId !== 'RS_INVENTORY') {
      return {
        isValid: false,
        status: 'INVALID_LICENSE',
        message: `License is for a different product (${payload.productId}).`,
        payload,
      };
    }

    // 3. Cryptographic signature check
    if (publicKeyPem) {
      const isSignatureValid = verifySignedLicense(license, publicKeyPem);
      if (!isSignatureValid) {
        return {
          isValid: false,
          status: 'INVALID_SIGNATURE',
          message: 'Cryptographic signature verification failed. The license file has been modified or corrupted.',
          payload,
        };
      }
    }

    // 4. Device binding check
    if (payload.installationId && currentInstallationId) {
      if (payload.installationId.trim() !== currentInstallationId.trim()) {
        return {
          isValid: false,
          status: 'DEVICE_MISMATCH',
          message: `This license is locked to installation ID ${payload.installationId}. Current machine is ${currentInstallationId}.`,
          payload,
        };
      }
    }

    // 5. Date validity check
    const now = new Date();
    if (payload.validFrom && new Date(payload.validFrom) > now) {
      return {
        isValid: false,
        status: 'NOT_YET_VALID',
        message: `This license will become valid on ${new Date(payload.validFrom).toLocaleDateString()}.`,
        payload,
      };
    }

    if (payload.expiresAt) {
      const expiryDate = new Date(payload.expiresAt);
      if (now > expiryDate) {
        return {
          isValid: false,
          status: 'EXPIRED',
          message: `Your license expired on ${expiryDate.toLocaleDateString()}. Core features remain view-only.`,
          payload,
        };
      }
    }

    // 6. Edition check
    // RS Inventory - Solo supports SOLO edition. LAN and BUSINESS are reserved.
    const status: LicenseStatus = payload.licenseType === 'TRIAL' ? 'TRIAL' : 'VALID';

    return {
      isValid: true,
      status,
      message:
        status === 'TRIAL'
          ? `Trial edition active. Valid until ${payload.expiresAt ? new Date(payload.expiresAt).toLocaleDateString() : 'N/A'}.`
          : `Fully licensed and activated for ${payload.customerName}.`,
      payload,
    };
  }

  /**
   * Import and activate signed license certificate
   */
  public async activateLicense(
    license: SignedLicense,
    currentInstallationId: string,
    publicKeyPem: string
  ): Promise<LicenseStatusDTO> {
    const validation = this.validateLicense(license, currentInstallationId, publicKeyPem);

    if (!validation.isValid) {
      throw new ValidationError(`License activation failed: ${validation.message}`);
    }

    const { payload } = license;
    const canonicalPayloadString = canonicalize(payload);

    // Save or update license in database
    await this.prisma.$transaction(async (tx) => {
      // Clear or mark previous licenses
      await tx.license.deleteMany({});

      await tx.license.create({
        data: {
          licenseId: payload.licenseId,
          licensePayload: canonicalPayloadString,
          signature: license.signature,
          signatureAlgorithm: license.signatureAlgorithm || 'RSA-SHA256',
          edition: payload.edition,
          licenseType: payload.licenseType,
          activationStatus: validation.status,
          customerName: payload.customerName,
          installationId: payload.installationId || null,
          issuedAt: new Date(payload.issuedAt),
          validFrom: new Date(payload.validFrom),
          expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
          lastValidatedAt: new Date(),
        },
      });
    });

    const statusDTO = this.buildStatusDTO(validation.status, payload, validation.message);
    this.cachedStatus = statusDTO;
    return statusDTO;
  }

  /**
   * Deactivate current license
   */
  public async deactivateLicense(): Promise<{ success: boolean; message: string }> {
    await this.prisma.license.deleteMany({});
    this.cachedStatus = null;
    return {
      success: true,
      message: 'License has been deactivated from this workstation.',
    };
  }

  /**
   * Entitlement evaluation: check if a specific feature is enabled
   */
  public isFeatureEnabled(code: FeatureCode): boolean {
    const status = this.cachedStatus;
    if (!status) {
      // Default offline Solo evaluation permits basic core features
      return ['inventory.core', 'sales.core', 'purchases.core', 'reports.basic', 'settings.advanced'].includes(code);
    }

    // Reserved features that are not yet active in Solo edition
    if (code === 'lan.sync' || code === 'business.multi_branch') {
      return false;
    }

    // If expired or deactivated, transaction-creating features are locked
    if (status.status === 'EXPIRED' || status.status === 'DEACTIVATED' || status.status === 'INVALID_SIGNATURE') {
      if (code === 'sales.core' || code === 'purchases.core') {
        return false;
      }
      // Historical viewing, reports, backups, and inventory remain open!
      return true;
    }

    if (status.status === 'VALID' || status.status === 'TRIAL') {
      return status.licensedFeatures.includes(code);
    }

    return false;
  }

  /**
   * Non-destructive assertion: throws BusinessRuleError only on write/creation actions if expired
   */
  public assertFeatureEntitled(code: FeatureCode, _actionName: string = 'this operation'): void {
    const status = this.cachedStatus;
    if (status && (status.status === 'EXPIRED' || status.isExpired)) {
      if (code === 'sales.core' || code === 'purchases.core') {
        throw new BusinessRuleError(
          `Your RS Inventory license has expired. Recording new transactions is disabled. ` +
            `All historical invoices, customer ledgers, inventory records, and reports remain fully accessible and exportable. ` +
            `Please renew or activate your license in Settings > Product License.`
        );
      }
    }

    if (!this.isFeatureEnabled(code)) {
      throw new BusinessRuleError(
        `The feature '${code}' is not included in your current edition (${status?.edition || 'SOLO'}). ` +
          `Please contact RS ORANGE TECH PVT LTD to upgrade.`
      );
    }
  }

  /**
   * Build DTO representation
   */
  private buildStatusDTO(
    status: LicenseStatus,
    payload: LicensePayload,
    message: string
  ): LicenseStatusDTO {
    const now = new Date();
    let daysRemaining: number | null = null;
    let isExpired = false;

    if (payload.expiresAt) {
      const expiry = new Date(payload.expiresAt);
      const diffMs = expiry.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      isExpired = diffMs <= 0;
    }

    const featureList = ALL_FEATURE_DEFINITIONS.map((f) => ({
      ...f,
      enabled: payload.licensedFeatures.includes(f.code) && !isExpired,
    }));

    return {
      status: isExpired ? 'EXPIRED' : status,
      edition: payload.edition,
      licenseType: payload.licenseType,
      licenseId: payload.licenseId,
      customerName: payload.customerName,
      installationId: this.currentInstallationId,
      isBoundToDevice: !!payload.installationId,
      issuedAt: payload.issuedAt,
      validFrom: payload.validFrom,
      expiresAt: payload.expiresAt,
      daysRemaining,
      isTrial: payload.licenseType === 'TRIAL',
      isExpired,
      updateEntitlementUntil: payload.updateEntitlementUntil,
      supportEntitlementUntil: payload.supportEntitlementUntil,
      licensedFeatures: payload.licensedFeatures,
      features: featureList,
      message,
    };
  }

  /**
   * Default status when no license is active
   */
  private buildUnlicensedStatus(): LicenseStatusDTO {
    const defaultFeatures: FeatureCode[] = [
      'inventory.core',
      'sales.core',
      'purchases.core',
      'reports.basic',
      'settings.advanced',
    ];

    const featureList = ALL_FEATURE_DEFINITIONS.map((f) => ({
      ...f,
      enabled: defaultFeatures.includes(f.code),
    }));

    return {
      status: 'NOT_ACTIVATED',
      edition: 'SOLO',
      licenseType: 'EVALUATION',
      installationId: this.currentInstallationId,
      isBoundToDevice: false,
      isTrial: true,
      isExpired: false,
      daysRemaining: null,
      licensedFeatures: defaultFeatures,
      features: featureList,
      message: 'Running in offline evaluation mode. Export an Activation Request to obtain an official license from RS ORANGE TECH.',
    };
  }

  /**
   * Status for corrupted or invalid license
   */
  private buildInvalidStatus(message: string): LicenseStatusDTO {
    const status = this.buildUnlicensedStatus();
    return {
      ...status,
      status: 'INVALID_LICENSE',
      message,
    };
  }
}
