/**
 * RS Inventory - Installation Tracking & License Verification Types
 * Company: RS ORANGE TECH PVT LTD
 */

export interface InstallationRegisterRequestDTO {
  installation_id: string;
  device_id: string;
  product: string;
  edition: string;
  app_version: string;
  os_name?: string;
  os_version?: string;
  installation_source?: string;
  installed_at?: string;
}

export interface InstallationRegisterResponseDTO {
  success: boolean;
  message: string;
  data?: {
    installation_id: string;
    device_id: string;
    status: string;
    registered_at: string;
  };
}

export interface StoreProfileTelemetryRequestDTO {
  installation_id: string;
  store_name: string;
  owner_name: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  gstin?: string;
}

export interface StoreProfileTelemetryResponseDTO {
  success: boolean;
  message: string;
  data?: {
    installation_id: string;
    store_name: string;
    updated_at: string;
  };
}

export interface LicenseActivateApiRequestDTO {
  installation_id: string;
  device_id: string;
  license_key: string;
  app_version: string;
}

export interface LicenseActivateApiResponseDTO {
  success: boolean;
  status: string;
  message: string;
  data?: {
    installation_id: string;
    device_id: string;
    license_key: string;
    edition?: string;
    product?: string;
    activated_at?: string;
    expires_at?: string | null;
  };
}

export interface LicenseValidateApiRequestDTO {
  installation_id: string;
  device_id: string;
  license_key: string;
}

export interface LicenseValidateApiResponseDTO {
  success: boolean;
  status: string;
  message: string;
  data?: {
    installation_id: string;
    device_id: string;
    license_key: string;
    is_active: boolean;
    validated_at?: string;
  };
}
