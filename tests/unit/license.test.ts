import { describe, it, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import {
  ALL_FEATURE_DEFINITIONS,
  canonicalize,
  verifySignedLicense,
  LicenseService,
} from '../../packages/business/src/services/license.service';
import {
  LicensePayload,
  SignedLicense,
} from '../../packages/types/src/license';
import { BusinessRuleError } from '../../packages/business/src/errors/app.error';

describe('Step 10: Product Licensing, Activation & Edition Management Unit Tests', () => {
  let testKeyPair: { publicKey: string; privateKey: string };

  beforeEach(() => {
    testKeyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
  });

  function signPayloadHelper(payload: LicensePayload, privateKey: string): SignedLicense {
    const canonical = canonicalize(payload);
    const signer = crypto.createSign('SHA256');
    signer.update(canonical, 'utf8');
    signer.end();
    return {
      payload,
      signatureAlgorithm: 'RSA-SHA256',
      signature: signer.sign(privateKey, 'base64'),
    };
  }

  describe('Feature Definitions & Edition Matrix', () => {
    it('should define all required feature codes across Solo, LAN, and Business tiers', () => {
      const codes = ALL_FEATURE_DEFINITIONS.map((f) => f.code);
      expect(codes).toContain('inventory.core');
      expect(codes).toContain('sales.core');
      expect(codes).toContain('purchases.core');
      expect(codes).toContain('reports.basic');
      expect(codes).toContain('reports.advanced');
      expect(codes).toContain('settings.advanced');
      expect(codes).toContain('users.multiple');
      expect(codes).toContain('locations.multiple');
      expect(codes).toContain('lan.sync');
      expect(codes).toContain('business.multi_branch');
      expect(ALL_FEATURE_DEFINITIONS.length).toBe(10);
    });
  });

  describe('Deterministic Canonical JSON Serialization', () => {
    it('should produce identical strings regardless of object key insertion order', () => {
      const objA = { z: 'last', a: 'first', m: { b: 2, a: 1 } };
      const objB = { a: 'first', m: { a: 1, b: 2 }, z: 'last' };

      expect(canonicalize(objA)).toBe(canonicalize(objB));
      expect(canonicalize(objA)).toBe('{"a":"first","m":{"a":1,"b":2},"z":"last"}');
    });

    it('should discard undefined properties deterministically', () => {
      const withUndefined = { id: '123', name: 'Test', extra: undefined };
      const withoutUndefined = { id: '123', name: 'Test' };

      expect(canonicalize(withUndefined)).toBe(canonicalize(withoutUndefined));
    });

    it('should maintain array element ordering while canonicalizing child objects', () => {
      const arrA = [{ b: 2, a: 1 }, { d: 4, c: 3 }];
      const arrB = [{ a: 1, b: 2 }, { c: 3, d: 4 }];

      expect(canonicalize(arrA)).toBe(canonicalize(arrB));
      expect(canonicalize(arrA)).toBe('[{"a":1,"b":2},{"c":3,"d":4}]');
    });
  });

  describe('Cryptographic RSA Digital Signatures', () => {
    it('should successfully sign and verify a valid license payload', () => {
      const payload: LicensePayload = {
        licenseSchemaVersion: 1,
        licenseId: 'RSLIC-SOLO-TEST-001',
        productId: 'RS_INVENTORY',
        productName: 'RS Inventory',
        edition: 'SOLO',
        licenseType: 'PERPETUAL',
        customerName: 'RS Supermarket',
        issuedAt: new Date().toISOString(),
        validFrom: new Date(Date.now() - 3600000).toISOString(),
        expiresAt: null,
        licensedFeatures: ['inventory.core', 'sales.core', 'purchases.core', 'reports.basic'],
        installationId: 'RS-INST-1111-2222-3333',
      };

      const signed = signPayloadHelper(payload, testKeyPair.privateKey);
      const isValid = verifySignedLicense(signed, testKeyPair.publicKey);
      expect(isValid).toBe(true);
    });

    it('should reject a tampered license with modified payload data', () => {
      const payload: LicensePayload = {
        licenseSchemaVersion: 1,
        licenseId: 'RSLIC-SOLO-TEST-002',
        productId: 'RS_INVENTORY',
        productName: 'RS Inventory',
        edition: 'SOLO',
        licenseType: 'TRIAL',
        customerName: 'Client Retail',
        issuedAt: new Date().toISOString(),
        validFrom: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        licensedFeatures: ['inventory.core', 'sales.core'],
        installationId: null,
      };

      const signed = signPayloadHelper(payload, testKeyPair.privateKey);

      // Malicious tamper: change customer name or features after signing
      const tamperedSigned: SignedLicense = {
        ...signed,
        payload: {
          ...signed.payload,
          customerName: 'Hacked Organization Name',
        },
      };

      const isValid = verifySignedLicense(tamperedSigned, testKeyPair.publicKey);
      expect(isValid).toBe(false);
    });

    it('should reject a license verified against the wrong public key', () => {
      const payload: LicensePayload = {
        licenseSchemaVersion: 1,
        licenseId: 'RSLIC-SOLO-TEST-003',
        productId: 'RS_INVENTORY',
        productName: 'RS Inventory',
        edition: 'SOLO',
        licenseType: 'PERPETUAL',
        customerName: 'Valid Client',
        issuedAt: new Date().toISOString(),
        validFrom: new Date().toISOString(),
        expiresAt: null,
        licensedFeatures: ['inventory.core'],
      };

      const signed = signPayloadHelper(payload, testKeyPair.privateKey);

      const otherKeyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const isValid = verifySignedLicense(signed, otherKeyPair.publicKey);
      expect(isValid).toBe(false);
    });
  });

  describe('LicenseService Validation & Business Rules', () => {
    let licenseService: LicenseService;
    const mockPrisma: any = {
      license: {
        findFirst: async () => null,
        create: async () => {},
        update: async () => {},
        deleteMany: async () => {},
      },
      $transaction: async (cb: any) => cb(mockPrisma),
    };

    beforeEach(() => {
      licenseService = new LicenseService(mockPrisma);
      licenseService.configure('RS-INST-SOLO-MACHINE-A', testKeyPair.publicKey);
    });

    it('should validate a perpetual active license with hardware binding', () => {
      const payload: LicensePayload = {
        licenseSchemaVersion: 1,
        licenseId: 'RSLIC-SOLO-PERPETUAL',
        productId: 'RS_INVENTORY',
        productName: 'RS Inventory',
        edition: 'SOLO',
        licenseType: 'PERPETUAL',
        customerName: 'City Retail Store',
        issuedAt: new Date().toISOString(),
        validFrom: new Date(Date.now() - 3600000).toISOString(),
        expiresAt: null,
        licensedFeatures: ['inventory.core', 'sales.core', 'purchases.core', 'reports.basic'],
        installationId: 'RS-INST-SOLO-MACHINE-A',
      };

      const signed = signPayloadHelper(payload, testKeyPair.privateKey);
      const result = licenseService.validateLicense(
        signed,
        'RS-INST-SOLO-MACHINE-A',
        testKeyPair.publicKey
      );

      expect(result.isValid).toBe(true);
      expect(result.status).toBe('VALID');
    });

    it('should detect DEVICE_MISMATCH when bound to a different machine installation ID', () => {
      const payload: LicensePayload = {
        licenseSchemaVersion: 1,
        licenseId: 'RSLIC-SOLO-BOUND-OTHER',
        productId: 'RS_INVENTORY',
        productName: 'RS Inventory',
        edition: 'SOLO',
        licenseType: 'PERPETUAL',
        customerName: 'City Retail Store',
        issuedAt: new Date().toISOString(),
        validFrom: new Date().toISOString(),
        expiresAt: null,
        licensedFeatures: ['inventory.core', 'sales.core'],
        installationId: 'RS-INST-MACHINE-XYZ', // Different machine
      };

      const signed = signPayloadHelper(payload, testKeyPair.privateKey);
      const result = licenseService.validateLicense(
        signed,
        'RS-INST-SOLO-MACHINE-A', // Current machine
        testKeyPair.publicKey
      );

      expect(result.isValid).toBe(false);
      expect(result.status).toBe('DEVICE_MISMATCH');
      expect(result.message).toContain('RS-INST-MACHINE-XYZ');
    });

    it('should detect EXPIRED status when expiry date is in the past', () => {
      const pastDate = new Date(Date.now() - 86400000 * 7).toISOString(); // 7 days ago
      const payload: LicensePayload = {
        licenseSchemaVersion: 1,
        licenseId: 'RSLIC-SOLO-EXPIRED',
        productId: 'RS_INVENTORY',
        productName: 'RS Inventory',
        edition: 'SOLO',
        licenseType: 'SUBSCRIPTION',
        customerName: 'Expired Client',
        issuedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        validFrom: new Date(Date.now() - 86400000 * 30).toISOString(),
        expiresAt: pastDate,
        licensedFeatures: ['inventory.core', 'sales.core'],
        installationId: 'RS-INST-SOLO-MACHINE-A',
      };

      const signed = signPayloadHelper(payload, testKeyPair.privateKey);
      const result = licenseService.validateLicense(
        signed,
        'RS-INST-SOLO-MACHINE-A',
        testKeyPair.publicKey
      );

      expect(result.isValid).toBe(false);
      expect(result.status).toBe('EXPIRED');
    });

    it('should enforce non-destructive expiration: reports and view-only remain enabled while new transactions throw BusinessRuleError', async () => {
      // Simulate expired license in database
      const pastDate = new Date(Date.now() - 86400000 * 5).toISOString();
      const payload: LicensePayload = {
        licenseSchemaVersion: 1,
        licenseId: 'RSLIC-EXPIRED-TEST',
        productId: 'RS_INVENTORY',
        productName: 'RS Inventory',
        edition: 'SOLO',
        licenseType: 'SUBSCRIPTION',
        customerName: 'Expired Shop',
        issuedAt: new Date(Date.now() - 86400000 * 35).toISOString(),
        validFrom: new Date(Date.now() - 86400000 * 35).toISOString(),
        expiresAt: pastDate,
        licensedFeatures: ['inventory.core', 'sales.core', 'purchases.core', 'reports.basic', 'reports.advanced'],
        installationId: 'RS-INST-SOLO-MACHINE-A',
      };

      const signed = signPayloadHelper(payload, testKeyPair.privateKey);

      mockPrisma.license.findFirst = async () => ({
        id: 'lic-1',
        licenseId: payload.licenseId,
        licensePayload: JSON.stringify(payload),
        signature: signed.signature,
        signatureAlgorithm: 'RSA-SHA256',
        edition: 'SOLO',
        licenseType: 'SUBSCRIPTION',
        activationStatus: 'EXPIRED',
        customerName: payload.customerName,
        installationId: payload.installationId,
        issuedAt: new Date(payload.issuedAt),
        validFrom: new Date(payload.validFrom),
        expiresAt: new Date(payload.expiresAt!),
        lastValidatedAt: new Date(),
      });

      const status = await licenseService.getLicenseStatus();
      expect(status.status).toBe('EXPIRED');
      expect(status.isExpired).toBe(true);

      // Historical reading/reporting remains accessible:
      expect(licenseService.isFeatureEnabled('reports.basic')).toBe(true);
      expect(licenseService.isFeatureEnabled('reports.advanced')).toBe(true);
      expect(licenseService.isFeatureEnabled('inventory.core')).toBe(true);

      // New transaction write operations are blocked with informative error:
      expect(licenseService.isFeatureEnabled('sales.core')).toBe(false);
      expect(licenseService.isFeatureEnabled('purchases.core')).toBe(false);

      expect(() => {
        licenseService.assertFeatureEntitled('sales.core', 'create invoice');
      }).toThrow(/license has expired/i);
    });

    it('should keep LAN and Business edition features isolated from Solo edition', () => {
      // Reserved features must return false in Solo edition
      expect(licenseService.isFeatureEnabled('lan.sync')).toBe(false);
      expect(licenseService.isFeatureEnabled('business.multi_branch')).toBe(false);
    });
  });
});
