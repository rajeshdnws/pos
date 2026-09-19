/**
 * RS Inventory - Electron License Verifier Service
 * Company: RS ORANGE TECH PVT LTD
 * 
 * Bridges Electron IPC, local filesystem dialogs, machine fingerprinting,
 * and the Business Layer LicenseService.
 */

import * as fs from 'fs';
import * as path from 'path';
import { app, dialog, BrowserWindow } from 'electron';
import { LicenseService } from '@rs-inventory/business';
import {
  ActivationRequestDTO,
  LicenseStatusDTO,
  SignedLicense,
} from '@rs-inventory/types';
import { MachineIdService } from './machine-id.service.js';

// Default embedded public key for RS ORANGE TECH PVT LTD (ensures zero asset packaging failure)
export const DEFAULT_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3SR9uo+ba9/6cJmak5uQ
Qf8rQgafKoY5wkP8a9+uJDX9cDIz1fH9nckRe2Lcv7KDgZ7kywbYcos5HRssTr73
xUe98k5jfyxDk9+2uqk9JaAqFSH/efHDMmn4GhjU7w6nlZm0xdS2NET9esiSS33B
VCeWPMjBG8itlR7DBvxxoAEtzg6tTQVBLK0u59atQgHerTVoyinYfgbTwKOwiMVe
SJJulyu10CSu1PnQC7BTVlESpDHdLa4D5tuQ5Ghvaz0ubeeoT5MwsgCO6xEL80Vk
iT+diYb5u1aGXUX+nxnrRDNDSoJDjdlCGFF3DLdsP6scyCzRN7oCfaoKJ5630zba
CQIDAQAB
-----END PUBLIC KEY-----`;

export class LicenseVerifierService {
  private licenseService: LicenseService;
  private machineIdService: MachineIdService;
  private publicKeyPem: string;
  private readonly localLicenseBackupPath: string;

  constructor(licenseService: LicenseService, machineIdService: MachineIdService) {
    this.licenseService = licenseService;
    this.machineIdService = machineIdService;

    // Load public key from asset file or fallback to embedded constant
    this.publicKeyPem = this.loadPublicKey();

    // AppData backup path for disaster-recovery/offline persistence
    let userDataDir: string;
    try {
      userDataDir = app.getPath('userData');
    } catch {
      userDataDir = process.cwd();
    }
    this.localLicenseBackupPath = path.join(userDataDir, 'license', 'active_license.rslic');

    // Configure the business layer license service with current installation ID and public key
    const currentInstallationId = this.machineIdService.getInstallationId();
    this.licenseService.configure(currentInstallationId, this.publicKeyPem);
  }

  /**
   * Initialize service on app startup.
   * If local license backup exists but database is empty, restores it.
   */
  public async initialize(): Promise<void> {
    try {
      const status = await this.licenseService.getLicenseStatus();

      // If DB has no active license, check local redundant backup
      if (status.status === 'NOT_ACTIVATED' && fs.existsSync(this.localLicenseBackupPath)) {
        try {
          const raw = fs.readFileSync(this.localLicenseBackupPath, 'utf8');
          const signed = JSON.parse(raw) as SignedLicense;
          await this.licenseService.activateLicense(
            signed,
            this.machineIdService.getInstallationId(),
            this.publicKeyPem
          );
        } catch {
          // Backup file unreadable or invalid; proceed with unactivated
        }
      }
    } catch {
      // Startup error handled gracefully
    }
  }

  private loadPublicKey(): string {
    try {
      const assetPath = path.join(__dirname, '..', 'assets', 'license_public.pem');
      if (fs.existsSync(assetPath)) {
        return fs.readFileSync(assetPath, 'utf8');
      }
    } catch {
      // Fall through to embedded constant
    }
    return DEFAULT_PUBLIC_KEY_PEM;
  }

  public async getLicenseStatus(): Promise<LicenseStatusDTO> {
    return this.licenseService.getLicenseStatus();
  }

  public async generateActivationRequest(customerName?: string): Promise<ActivationRequestDTO> {
    return this.machineIdService.generateActivationRequest(customerName || 'RS ORANGE TECH Client', 'SOLO');
  }

  public async exportActivationRequest(
    customerName?: string,
    targetPath?: string
  ): Promise<{ filePath: string; fileName: string }> {
    const request = await this.generateActivationRequest(customerName);
    const defaultFileName = `RS_ACTIVATION_REQUEST_${request.installationId}.rsreq`;

    let destinationPath = targetPath;
    if (!destinationPath) {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      const saveResult = await dialog.showSaveDialog(focusedWindow || undefined as any, {
        title: 'Export RS Inventory Activation Request',
        defaultPath: defaultFileName,
        filters: [{ name: 'RS Activation Request (*.rsreq)', extensions: ['rsreq'] }],
      });

      if (saveResult.canceled || !saveResult.filePath) {
        throw new Error('Export cancelled by user.');
      }
      destinationPath = saveResult.filePath;
    }

    fs.writeFileSync(destinationPath, JSON.stringify(request, null, 2), 'utf8');
    return {
      filePath: destinationPath,
      fileName: path.basename(destinationPath),
    };
  }

  public async chooseLicenseFile(): Promise<string | null> {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const openResult = await dialog.showOpenDialog(focusedWindow || undefined as any, {
      title: 'Select RS Inventory License File',
      properties: ['openFile'],
      filters: [
        { name: 'RS License Certificate (*.rslic, *.json)', extensions: ['rslic', 'json'] },
        { name: 'All Files (*.*)', extensions: ['*'] },
      ],
    });

    if (openResult.canceled || !openResult.filePaths || openResult.filePaths.length === 0) {
      return null;
    }

    return openResult.filePaths[0];
  }

  public async importLicenseFile(filePath?: string): Promise<LicenseStatusDTO> {
    let resolvedPath = filePath;
    if (!resolvedPath) {
      const chosen = await this.chooseLicenseFile();
      if (!chosen) {
        throw new Error('File selection cancelled by user.');
      }
      resolvedPath = chosen;
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`License file not found at: ${resolvedPath}`);
    }

    const rawContent = fs.readFileSync(resolvedPath, 'utf8');
    return this.activateLicenseContent(rawContent);
  }

  public async activateLicenseContent(licenseFileContent: string): Promise<LicenseStatusDTO> {
    let signed: SignedLicense;
    try {
      signed = JSON.parse(licenseFileContent) as SignedLicense;
    } catch {
      throw new Error('Invalid license certificate: Unable to parse JSON.');
    }

    const currentInstallationId = this.machineIdService.getInstallationId();
    const status = await this.licenseService.activateLicense(
      signed,
      currentInstallationId,
      this.publicKeyPem
    );

    // Write redundant backup to AppData/license
    try {
      const dir = path.dirname(this.localLicenseBackupPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.localLicenseBackupPath, JSON.stringify(signed, null, 2), 'utf8');
    } catch {
      // Non-fatal if redundant backup write fails
    }

    return status;
  }

  public async deactivateLicense(): Promise<{ success: boolean; message: string }> {
    const result = await this.licenseService.deactivateLicense();

    // Clean up local redundant backup
    try {
      if (fs.existsSync(this.localLicenseBackupPath)) {
        fs.unlinkSync(this.localLicenseBackupPath);
      }
    } catch {
      // Non-fatal
    }

    return result;
  }
}
