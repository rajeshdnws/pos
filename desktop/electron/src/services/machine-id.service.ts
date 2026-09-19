/**
 * RS Inventory - Machine ID & Hardware Fingerprint Service
 * Company: RS ORANGE TECH PVT LTD
 * 
 * Generates a stable, non-invasive installation fingerprint for offline device binding.
 * Format: RS-INST-XXXX-XXXX-XXXX
 * 
 * Privacy Guarantees:
 * - Never includes usernames, passwords, customer data, or personally identifiable information.
 * - Derived strictly from non-sensitive system attributes (OS platform, architecture, hostname, network MAC).
 * - Persisted locally in user app data to guarantee stability across reboots and adapter changes.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { app } from 'electron';
import { ActivationRequestDTO, ProductEdition } from '@rs-inventory/types';

export class MachineIdService {
  private cachedInstallationId: string | null = null;
  private readonly storageFilePath: string;

  constructor() {
    let appDataDir: string;
    try {
      appDataDir = app.getPath('userData');
    } catch {
      appDataDir = path.join(os.homedir(), '.rs-inventory');
    }
    this.storageFilePath = path.join(appDataDir, 'machine-id.json');
  }

  /**
   * Get or generate the machine installation ID
   */
  public getInstallationId(): string {
    if (this.cachedInstallationId) {
      return this.cachedInstallationId;
    }

    // 1. Try reading existing saved ID from disk
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf8');
        const data = JSON.parse(raw);
        if (data && typeof data.installationId === 'string' && data.installationId.length > 0) {
          this.cachedInstallationId = data.installationId;
          return data.installationId;
        }
      }
    } catch {
      // Fall through to regeneration
    }

    // 2. Generate fingerprint from hardware & OS attributes
    const networkInterfaces = os.networkInterfaces();
    const macAddresses: string[] = [];

    for (const ifaceName of Object.keys(networkInterfaces)) {
      const iface = networkInterfaces[ifaceName];
      if (iface) {
        for (const net of iface) {
          if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
            macAddresses.push(net.mac);
          }
        }
      }
    }

    macAddresses.sort();
    const primaryMac = macAddresses[0] || '00:11:22:33:44:55';

    const rawFingerprint = [
      os.platform(),
      os.arch(),
      os.hostname().toLowerCase(),
      primaryMac,
    ].join('::');

    const hash = crypto.createHash('sha256').update(rawFingerprint, 'utf8').digest('hex').toUpperCase();

    // Format as RS-INST-XXXX-XXXX-XXXX
    const formattedId = `RS-INST-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}`;
    this.cachedInstallationId = formattedId;

    // 3. Persist to disk for stability
    try {
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.storageFilePath,
        JSON.stringify(
          {
            installationId: formattedId,
            generatedAt: new Date().toISOString(),
            platform: os.platform(),
            arch: os.arch(),
          },
          null,
          2
        ),
        'utf8'
      );
    } catch {
      // Non-fatal if filesystem write fails; memory cache holds it
    }

    return formattedId;
  }

  /**
   * Build complete Activation Request DTO for offline licensing
   */
  public generateActivationRequest(
    customerName: string = 'Valued Client',
    edition: ProductEdition = 'SOLO'
  ): ActivationRequestDTO {
    const installationId = this.getInstallationId();

    let appVersion = '1.0.0';
    try {
      appVersion = app.getVersion();
    } catch {
      // Default fallback
    }

    return {
      productId: 'RS_INVENTORY',
      edition,
      installationId,
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      appVersion,
      requestedAt: new Date().toISOString(),
      customerName,
    };
  }
}
