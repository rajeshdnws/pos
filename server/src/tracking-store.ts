/**
 * RS Inventory - Telemetry & License Tracking Store
 * Company: RS ORANGE TECH PVT LTD
 */

import {
  InstallationRegisterRequestDTO,
  StoreProfileTelemetryRequestDTO,
  LicenseActivateApiRequestDTO,
} from '@rs-inventory/types';

export interface RegisteredInstallation extends InstallationRegisterRequestDTO {
  registered_at: string;
  updated_at: string;
}

export interface SavedStoreProfile extends StoreProfileTelemetryRequestDTO {
  updated_at: string;
}

export interface ActivatedLicenseRecord {
  installation_id: string;
  device_id: string;
  license_key: string;
  product: string;
  edition: string;
  app_version: string;
  is_active: boolean;
  activated_at: string;
  expires_at: string | null;
}

export class TrackingStore {
  private installations = new Map<string, RegisteredInstallation>();
  private storeProfiles = new Map<string, SavedStoreProfile>();
  private activeLicenses = new Map<string, ActivatedLicenseRecord>();

  public registerInstallation(dto: InstallationRegisterRequestDTO): RegisteredInstallation {
    const existing = this.installations.get(dto.installation_id);
    const now = new Date().toISOString();
    const record: RegisteredInstallation = {
      ...dto,
      installed_at: dto.installed_at || existing?.installed_at || now,
      registered_at: existing?.registered_at || now,
      updated_at: now,
    };
    this.installations.set(dto.installation_id, record);
    return record;
  }

  public getInstallation(installationId: string): RegisteredInstallation | undefined {
    return this.installations.get(installationId);
  }

  public saveStoreProfile(dto: StoreProfileTelemetryRequestDTO): SavedStoreProfile {
    const now = new Date().toISOString();
    const record: SavedStoreProfile = {
      ...dto,
      updated_at: now,
    };
    this.storeProfiles.set(dto.installation_id, record);
    return record;
  }

  public getStoreProfile(installationId: string): SavedStoreProfile | undefined {
    return this.storeProfiles.get(installationId);
  }

  public activateLicense(dto: LicenseActivateApiRequestDTO): ActivatedLicenseRecord {
    const now = new Date().toISOString();
    // Default edition inferred from license key or installation if available
    const installation = this.installations.get(dto.installation_id);
    let edition = installation?.edition || 'BUSINESS';
    if (dto.license_key.includes('ENTERPRISE') || dto.license_key.includes('BIZ')) {
      edition = 'BUSINESS';
    } else if (dto.license_key.includes('SOLO')) {
      edition = 'SOLO';
    }

    const key = `${dto.installation_id}:${dto.device_id}:${dto.license_key}`;
    const record: ActivatedLicenseRecord = {
      installation_id: dto.installation_id,
      device_id: dto.device_id,
      license_key: dto.license_key,
      product: 'RS_INVENTORY',
      edition,
      app_version: dto.app_version || '1.0.0',
      is_active: true,
      activated_at: now,
      expires_at: null, // Perpetual by default
    };

    this.activeLicenses.set(key, record);
    return record;
  }

  public validateLicense(
    installationId: string,
    deviceId: string,
    licenseKey: string
  ): { isValid: boolean; record?: ActivatedLicenseRecord; message: string } {
    const key = `${installationId}:${deviceId}:${licenseKey}`;
    const record = this.activeLicenses.get(key);

    if (record && record.is_active) {
      return {
        isValid: true,
        record,
        message: 'License is valid and active',
      };
    }

    // Check if license exists under installation_id even if device_id matches
    const matchingKey = Array.from(this.activeLicenses.values()).find(
      (lic) => lic.installation_id === installationId && lic.license_key === licenseKey
    );

    if (matchingKey && matchingKey.is_active) {
      return {
        isValid: true,
        record: matchingKey,
        message: 'License is valid and active',
      };
    }

    // If key has valid format (e.g. RS-BIZ-ENTERPRISE-2026 or RS-*) auto-activate/validate for demonstration
    if (licenseKey && licenseKey.startsWith('RS-')) {
      const autoRecord = this.activateLicense({
        installation_id: installationId,
        device_id: deviceId,
        license_key: licenseKey,
        app_version: '1.0.0',
      });
      return {
        isValid: true,
        record: autoRecord,
        message: 'License validated successfully',
      };
    }

    return {
      isValid: false,
      message: 'License key not found or inactive for this installation',
    };
  }

  public clear(): void {
    this.installations.clear();
    this.storeProfiles.clear();
    this.activeLicenses.clear();
  }
}
