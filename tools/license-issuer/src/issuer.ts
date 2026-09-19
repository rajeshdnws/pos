/**
 * RS Inventory - License Issuer CLI
 * Company: RS ORANGE TECH PVT LTD
 * 
 * INTERNAL TOOL: Generates cryptographic keys and issues signed license certificates.
 * PRIVATE KEYS MUST NEVER BE EMBEDDED IN CLIENT/DESKTOP DISTRIBUTIONS.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export type ProductEdition = 'SOLO' | 'LAN' | 'BUSINESS';
export type LicenseType = 'PERPETUAL' | 'SUBSCRIPTION' | 'TRIAL' | 'EVALUATION';
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
  productId: string;
  productName: string;
  edition: ProductEdition;
  licenseType: LicenseType;
  customerId?: string;
  customerName: string;
  issuedAt: string;
  validFrom: string;
  expiresAt: string | null;
  updateEntitlementUntil?: string | null;
  supportEntitlementUntil?: string | null;
  licensedFeatures: FeatureCode[];
  maximumUsers?: number;
  maximumDevices?: number;
  installationId?: string | null;
}

export interface SignedLicense {
  payload: LicensePayload;
  signatureAlgorithm: 'RSA-SHA256' | 'Ed25519';
  signature: string;
}

export interface ActivationRequestDTO {
  productId: string;
  edition: ProductEdition;
  installationId: string;
  hostname: string;
  platform: string;
  arch: string;
  appVersion: string;
  requestedAt: string;
  customerName?: string;
}

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

/**
 * Generate RSA 2048-bit key pair
 */
export function generateKeyPair(): { privateKey: string; publicKey: string } {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
}

/**
 * Sign payload using RSA-SHA256
 */
export function signPayload(payload: LicensePayload, privateKeyPem: string): SignedLicense {
  const canonicalString = canonicalize(payload);
  const signer = crypto.createSign('SHA256');
  signer.update(canonicalString, 'utf8');
  signer.end();
  const signature = signer.sign(privateKeyPem, 'base64');
  return {
    payload,
    signatureAlgorithm: 'RSA-SHA256',
    signature,
  };
}

/**
 * Verify signed license using RSA-SHA256
 */
export function verifySignedLicense(license: SignedLicense, publicKeyPem: string): boolean {
  try {
    const canonicalString = canonicalize(license.payload);
    const verifier = crypto.createVerify('SHA256');
    verifier.update(canonicalString, 'utf8');
    verifier.end();
    return verifier.verify(publicKeyPem, license.signature, 'base64');
  } catch {
    return false;
  }
}

/**
 * Default features enabled for each edition
 */
export function getDefaultFeaturesForEdition(edition: ProductEdition): FeatureCode[] {
  const soloFeatures: FeatureCode[] = [
    'inventory.core',
    'sales.core',
    'purchases.core',
    'reports.basic',
    'reports.advanced',
    'settings.advanced',
  ];

  if (edition === 'SOLO') {
    return soloFeatures;
  }
  if (edition === 'LAN') {
    return [...soloFeatures, 'users.multiple', 'locations.multiple', 'lan.sync'];
  }
  if (edition === 'BUSINESS') {
    return [
      ...soloFeatures,
      'users.multiple',
      'locations.multiple',
      'lan.sync',
      'business.multi_branch',
    ];
  }
  return soloFeatures;
}

// CLI Execution handler
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  const defaultKeysDir = path.resolve(process.cwd(), 'tools/license-issuer/keys');
  const privateKeyPath = path.join(defaultKeysDir, 'private/license_private.pem');
  const publicKeyPath = path.join(defaultKeysDir, 'public/license_public.pem');
  const electronPublicKeyPath = path.resolve(
    process.cwd(),
    'desktop/electron/src/assets/license_public.pem'
  );

  switch (command) {
    case 'generate-keys': {
      console.log('Generating RSA-2048 key pair for RS ORANGE TECH PVT LTD...');
      const { privateKey, publicKey } = generateKeyPair();

      fs.mkdirSync(path.dirname(privateKeyPath), { recursive: true });
      fs.mkdirSync(path.dirname(publicKeyPath), { recursive: true });
      fs.mkdirSync(path.dirname(electronPublicKeyPath), { recursive: true });

      fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
      fs.writeFileSync(publicKeyPath, publicKey);
      fs.writeFileSync(electronPublicKeyPath, publicKey);

      console.log('✓ Private key saved to: ' + privateKeyPath);
      console.log('  WARNING: Never commit or distribute the private key!');
      console.log('✓ Public key saved to: ' + publicKeyPath);
      console.log('✓ Public key synced to Electron assets: ' + electronPublicKeyPath);
      break;
    }

    case 'issue': {
      if (!fs.existsSync(privateKeyPath)) {
        console.error('Error: Private key not found at ' + privateKeyPath);
        console.error('Run "generate-keys" first.');
        process.exit(1);
      }
      const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

      // Simple argument parser
      const getArg = (name: string, fallback?: string): string | undefined => {
        const idx = args.indexOf(name);
        return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
      };

      const customerName = getArg('--customer', 'RS ORANGE TECH Client')!;
      const edition = (getArg('--edition', 'SOLO')!.toUpperCase()) as ProductEdition;
      const licenseType = (getArg('--type', 'PERPETUAL')!.toUpperCase()) as LicenseType;
      const installationId = getArg('--machine', undefined);
      const expiresAt = getArg('--expires') || null;
      const days = getArg('--days');

      let computedExpiresAt: string | null = expiresAt;
      if (days && !computedExpiresAt) {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(days, 10));
        computedExpiresAt = d.toISOString();
      }

      const now = new Date().toISOString();
      const licenseId = `RSLIC-${edition}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const payload: LicensePayload = {
        licenseSchemaVersion: 1,
        licenseId,
        productId: 'RS_INVENTORY',
        productName: 'RS Inventory',
        edition,
        licenseType,
        customerName,
        issuedAt: now,
        validFrom: now,
        expiresAt: computedExpiresAt,
        updateEntitlementUntil: computedExpiresAt || '2035-12-31T23:59:59.000Z',
        supportEntitlementUntil: computedExpiresAt || '2035-12-31T23:59:59.000Z',
        licensedFeatures: getDefaultFeaturesForEdition(edition),
        maximumUsers: edition === 'SOLO' ? 1 : 10,
        maximumDevices: edition === 'SOLO' ? 1 : 5,
        installationId: installationId || null,
      };

      const signed = signPayload(payload, privateKey);
      const outPath = getArg('--out', path.join(process.cwd(), `${licenseId}.rslic`))!;
      fs.writeFileSync(outPath, JSON.stringify(signed, null, 2), 'utf8');

      console.log('✓ Successfully issued signed license!');
      console.log('  License ID:      ', payload.licenseId);
      console.log('  Customer:        ', payload.customerName);
      console.log('  Edition:         ', payload.edition);
      console.log('  Type:            ', payload.licenseType);
      console.log('  Machine Bound:   ', payload.installationId || 'None (Unbound)');
      console.log('  Expires:         ', payload.expiresAt || 'Perpetual');
      console.log('  File:            ', outPath);
      break;
    }

    case 'from-req': {
      if (!fs.existsSync(privateKeyPath)) {
        console.error('Error: Private key not found at ' + privateKeyPath);
        process.exit(1);
      }
      const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

      const getArg = (name: string, fallback?: string): string | undefined => {
        const idx = args.indexOf(name);
        return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
      };

      const reqPath = getArg('--req');
      if (!reqPath || !fs.existsSync(reqPath)) {
        console.error('Error: Activation request file not found. Provide --req <path>');
        process.exit(1);
      }

      const reqContent = JSON.parse(fs.readFileSync(reqPath, 'utf8')) as ActivationRequestDTO;
      const editionRaw = getArg('--edition') || (reqContent && reqContent.edition) || 'SOLO';
      const edition = editionRaw.toUpperCase() as ProductEdition;
      const licenseType = (getArg('--type', 'PERPETUAL')!).toUpperCase() as LicenseType;
      const customerName = getArg('--customer') || (reqContent && reqContent.customerName) || 'Valued Customer';
      const days = getArg('--days');
      let expiresAt: string | null = getArg('--expires') || null;
      if (days && !expiresAt) {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(days, 10));
        expiresAt = d.toISOString();
      }

      const now = new Date().toISOString();
      const licenseId = `RSLIC-${edition}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const payload: LicensePayload = {
        licenseSchemaVersion: 1,
        licenseId,
        productId: 'RS_INVENTORY',
        productName: 'RS Inventory',
        edition,
        licenseType,
        customerName,
        issuedAt: now,
        validFrom: now,
        expiresAt,
        updateEntitlementUntil: expiresAt || '2035-12-31T23:59:59.000Z',
        supportEntitlementUntil: expiresAt || '2035-12-31T23:59:59.000Z',
        licensedFeatures: getDefaultFeaturesForEdition(edition),
        maximumUsers: edition === 'SOLO' ? 1 : 10,
        maximumDevices: edition === 'SOLO' ? 1 : 5,
        installationId: reqContent.installationId,
      };

      const signed = signPayload(payload, privateKey);
      const outPath = getArg('--out', path.join(process.cwd(), `${licenseId}.rslic`))!;
      fs.writeFileSync(outPath, JSON.stringify(signed, null, 2), 'utf8');

      console.log('✓ Successfully issued signed license from activation request!');
      console.log('  Customer:        ', payload.customerName);
      console.log('  Bound to Machine:', payload.installationId);
      console.log('  Output file:     ', outPath);
      break;
    }

    case 'verify': {
      const getArg = (name: string, fallback?: string): string | undefined => {
        const idx = args.indexOf(name);
        return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
      };

      const filePath = getArg('--file');
      if (!filePath || !fs.existsSync(filePath)) {
        console.error('Error: Provide valid license file with --file <path>');
        process.exit(1);
      }

      const keyPath = getArg('--pubkey') || publicKeyPath;
      if (!fs.existsSync(keyPath)) {
        console.error('Error: Public key not found at ' + keyPath);
        process.exit(1);
      }

      const pubKey = fs.readFileSync(keyPath, 'utf8');
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8')) as SignedLicense;
      const isValid = verifySignedLicense(content, pubKey);

      console.log('License Verification:');
      console.log('  Valid Signature:', isValid ? '✓ YES (Authentic RS ORANGE TECH Signature)' : '✗ NO (Tampered or Corrupted)');
      console.log('  Payload:', JSON.stringify(content.payload, null, 2));
      break;
    }

    default:
      console.log(`
RS Inventory License Issuer CLI
Usage:
  node dist/issuer.js generate-keys
  node dist/issuer.js issue --customer "Name" [--edition SOLO|LAN|BUSINESS] [--type PERPETUAL|SUBSCRIPTION|TRIAL] [--expires YYYY-MM-DD] [--machine RS-INST-...] [--out file.rslic]
  node dist/issuer.js from-req --req <request.rsreq> [--type PERPETUAL|SUBSCRIPTION|TRIAL] [--out file.rslic]
  node dist/issuer.js verify --file <file.rslic> [--pubkey <public.pem>]
`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
