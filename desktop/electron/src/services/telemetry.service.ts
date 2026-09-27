/**
 * RS Inventory - Telemetry & Tracking Client Service
 * Company: RS ORANGE TECH PVT LTD
 * 
 * Handles remote API tracking calls to rsorangetech.com:
 * - POST /api/inventory/v1/installations/register
 * - POST /api/inventory/v1/installations/store-profile
 * - POST /api/inventory/v1/licenses/activate
 * - POST /api/inventory/v1/licenses/validate
 * 
 * Resilient & offline-first: Swallows network errors gracefully so app operation is never interrupted.
 */

import * as os from 'os';
import { app } from 'electron';
import { MachineIdService } from './machine-id.service.js';
import { LoggerService } from './logger.service.js';
import {
  InstallationRegisterRequestDTO,
  InstallationRegisterResponseDTO,
  StoreProfileTelemetryRequestDTO,
  StoreProfileTelemetryResponseDTO,
  LicenseActivateApiRequestDTO,
  LicenseActivateApiResponseDTO,
  LicenseValidateApiRequestDTO,
  LicenseValidateApiResponseDTO,
} from '@rs-inventory/types';

export class TelemetryService {
  private baseUrl: string;
  private machineIdService: MachineIdService;
  private logger: LoggerService;

  constructor(machineIdService: MachineIdService, baseUrl?: string) {
    this.machineIdService = machineIdService;
    this.logger = LoggerService.getInstance();
    this.baseUrl = (baseUrl || process.env.TELEMETRY_API_URL || 'https://rsorangetech.com/api/inventory/v1').replace(/\/$/, '');
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getDeviceId(): string {
    const hostname = os.hostname().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    return `DEV-${hostname || 'DESKTOP-01'}`;
  }

  /**
   * Register installation hardware & OS metadata with remote endpoint
   */
  public async registerInstallation(
    customParams?: Partial<InstallationRegisterRequestDTO>
  ): Promise<InstallationRegisterResponseDTO | null> {
    const installationId = this.machineIdService.getInstallationId();
    const deviceId = this.getDeviceId();

    let appVersion = '1.0.0';
    try {
      appVersion = app.getVersion();
    } catch {
      // Fallback
    }

    const payload: InstallationRegisterRequestDTO = {
      installation_id: installationId,
      device_id: deviceId,
      product: 'RS_INVENTORY',
      edition: 'BUSINESS',
      app_version: appVersion,
      os_name: process.platform === 'win32' ? 'Windows' : os.type(),
      os_version: `${os.release()}`,
      installation_source: 'Website',
      installed_at: new Date().toISOString(),
      ...customParams,
    };

    try {
      this.logger.info(`Telemetry: Registering installation ${payload.installation_id} at ${this.baseUrl}/installations/register`);
      const response = await fetch(`${this.baseUrl}/installations/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.warn(`Telemetry: Installation registration returned HTTP ${response.status}`);
        return null;
      }

      const data = (await response.json()) as InstallationRegisterResponseDTO;
      this.logger.info('Telemetry: Installation registered successfully', data);
      return data;
    } catch (err: any) {
      this.logger.warn('Telemetry: Unable to reach tracking server for installation registration (offline mode)', err.message);
      return null;
    }
  }

  /**
   * Sync store/company profile details with tracking backend
   */
  public async syncStoreProfile(
    profile: Partial<StoreProfileTelemetryRequestDTO>
  ): Promise<StoreProfileTelemetryResponseDTO | null> {
    const installationId = this.machineIdService.getInstallationId();

    const rawMobile = profile.mobile || (profile as any).phone || '';
    const rawStoreName = profile.store_name || (profile as any).businessName || (profile as any).name || 'My Store';

    const payload: StoreProfileTelemetryRequestDTO = {
      installation_id: installationId,
      store_name: String(rawStoreName).trim() || 'My Store',
      owner_name: String(profile.owner_name || 'Store Owner').trim(),
      mobile: String(rawMobile).trim() || 'N/A',
      email: String(profile.email || '').trim(),
      address: String(profile.address || 'Not Specified').trim() || 'Not Specified',
      city: String(profile.city || '').trim(),
      state: String(profile.state || '').trim(),
      pincode: String(profile.pincode || '').trim(),
      country: String(profile.country || 'India').trim(),
      gstin: String(profile.gstin || '').trim(),
      ...profile,
    };

    // Ensure mandatory Laravel validation rules (required|string) are strictly satisfied
    if (!payload.installation_id) payload.installation_id = installationId;
    if (!payload.store_name || !payload.store_name.trim()) payload.store_name = 'My Store';
    if (!payload.mobile || !payload.mobile.trim()) payload.mobile = 'N/A';
    if (!payload.address || !payload.address.trim()) payload.address = 'Not Specified';

    try {
      this.logger.info(`Telemetry: Syncing store profile for ${payload.installation_id} to ${this.baseUrl}/installations/store-profile`);
      const response = await fetch(`${this.baseUrl}/installations/store-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        this.logger.warn(`Telemetry: Store profile sync returned HTTP ${response.status}: ${errText}`);
        return null;
      }

      const data = (await response.json()) as StoreProfileTelemetryResponseDTO;
      this.logger.info('Telemetry: Store profile synced successfully', data);
      return data;
    } catch (err: any) {
      this.logger.warn('Telemetry: Unable to reach tracking server for store profile sync', err.message);
      return null;
    }
  }

  /**
   * Activate license via online API endpoint
   */
  public async activateLicenseOnline(
    licenseKey: string,
    customParams?: Partial<LicenseActivateApiRequestDTO>
  ): Promise<LicenseActivateApiResponseDTO | null> {
    const installationId = this.machineIdService.getInstallationId();
    const deviceId = this.getDeviceId();

    let appVersion = '1.0.0';
    try {
      appVersion = app.getVersion();
    } catch {
      // Fallback
    }

    const payload: LicenseActivateApiRequestDTO = {
      installation_id: installationId,
      device_id: deviceId,
      license_key: licenseKey,
      app_version: appVersion,
      ...customParams,
    };

    try {
      this.logger.info(`Telemetry: Activating license online key ${licenseKey}`);
      const response = await fetch(`${this.baseUrl}/licenses/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Telemetry: License activation returned HTTP ${response.status}: ${errorText}`);
        return null;
      }

      const data = (await response.json()) as LicenseActivateApiResponseDTO;
      this.logger.info('Telemetry: Online license activation result:', data);
      return data;
    } catch (err: any) {
      this.logger.warn('Telemetry: Unable to reach tracking server for online license activation', err.message);
      return null;
    }
  }

  /**
   * Validate license via online API endpoint
   */
  public async validateLicenseOnline(
    licenseKey: string,
    customParams?: Partial<LicenseValidateApiRequestDTO>
  ): Promise<LicenseValidateApiResponseDTO | null> {
    const installationId = this.machineIdService.getInstallationId();
    const deviceId = this.getDeviceId();

    const payload: LicenseValidateApiRequestDTO = {
      installation_id: installationId,
      device_id: deviceId,
      license_key: licenseKey,
      ...customParams,
    };

    try {
      this.logger.info(`Telemetry: Validating license online key ${licenseKey}`);
      const response = await fetch(`${this.baseUrl}/licenses/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Telemetry: License validation returned HTTP ${response.status}: ${errorText}`);
        return null;
      }

      const data = (await response.json()) as LicenseValidateApiResponseDTO;
      this.logger.info('Telemetry: Online license validation result:', data);
      return data;
    } catch (err: any) {
      this.logger.warn('Telemetry: Unable to reach tracking server for online license validation', err.message);
      return null;
    }
  }
}
