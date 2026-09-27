/**
 * RS Inventory - Telemetry & License Tracking API Integration Tests
 * Company: RS ORANGE TECH PVT LTD
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TrackingServer } from '../../server/src/tracking-server';
import { TelemetryService } from '../../desktop/electron/src/services/telemetry.service';
import { MachineIdService } from '../../desktop/electron/src/services/machine-id.service';

describe('RS Inventory Telemetry & Tracking API Integration Tests', () => {
  let server: TrackingServer;
  let serverPort: number;
  let baseUrl: string;

  beforeAll(async () => {
    server = new TrackingServer();
    serverPort = await server.listen(0, '127.0.0.1'); // Listen on random free port
    baseUrl = `http://127.0.0.1:${serverPort}/api/inventory/v1`;
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    server.getStore().clear();
  });

  describe('1. Endpoint: POST /api/inventory/v1/installations/register', () => {
    it('should register installation telemetry successfully with exact curl payload', async () => {
      const payload = {
        installation_id: 'INST-BIZ-9001',
        device_id: 'DEV-DESKTOP-01',
        product: 'RS_INVENTORY',
        edition: 'BUSINESS',
        app_version: '1.0.0',
        os_name: 'Windows',
        os_version: '11.0 Pro',
        installation_source: 'Website',
        installed_at: '2026-09-26T12:00:00Z',
      };

      const response = await fetch(`${baseUrl}/installations/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
      const data: any = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Installation registered successfully');
      expect(data.data.installation_id).toBe('INST-BIZ-9001');
      expect(data.data.device_id).toBe('DEV-DESKTOP-01');
      expect(data.data.status).toBe('REGISTERED');
    });

    it('should reject registration missing installation_id or device_id', async () => {
      const response = await fetch(`${baseUrl}/installations/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: 'RS_INVENTORY' }),
      });

      expect(response.status).toBe(400);
      const data: any = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Missing required fields');
    });
  });

  describe('2. Endpoint: POST /api/inventory/v1/installations/store-profile', () => {
    it('should register and update store profile telemetry with exact curl payload', async () => {
      const payload = {
        installation_id: 'INST-BIZ-9001',
        store_name: 'Apex Mega Supermarket',
        owner_name: 'Rajesh Kumar',
        mobile: '+91 98765 43210',
        email: 'rajesh@apexsupermart.com',
        address: 'Plot 104, Trade Center, Sector 18',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        gstin: '09AAACA12341Z5',
      };

      const response = await fetch(`${baseUrl}/installations/store-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
      const data: any = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Store profile updated successfully');
      expect(data.data.installation_id).toBe('INST-BIZ-9001');
      expect(data.data.store_name).toBe('Apex Mega Supermarket');

      const saved = server.getStore().getStoreProfile('INST-BIZ-9001');
      expect(saved?.owner_name).toBe('Rajesh Kumar');
      expect(saved?.gstin).toBe('09AAACA12341Z5');
    });
  });

  describe('3. Endpoint: POST /api/inventory/v1/licenses/activate', () => {
    it('should activate online license with exact curl payload', async () => {
      const payload = {
        installation_id: 'INST-BIZ-9001',
        device_id: 'DEV-DESKTOP-01',
        license_key: 'RS-BIZ-ENTERPRISE-2026',
        app_version: '1.0.0',
      };

      const response = await fetch(`${baseUrl}/licenses/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
      const data: any = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('VALID');
      expect(data.data.installation_id).toBe('INST-BIZ-9001');
      expect(data.data.device_id).toBe('DEV-DESKTOP-01');
      expect(data.data.license_key).toBe('RS-BIZ-ENTERPRISE-2026');
      expect(data.data.edition).toBe('BUSINESS');
    });
  });

  describe('4. Endpoint: POST /api/inventory/v1/licenses/validate', () => {
    it('should validate an activated license key with exact curl payload', async () => {
      // First activate
      await fetch(`${baseUrl}/licenses/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installation_id: 'INST-BIZ-9001',
          device_id: 'DEV-DESKTOP-01',
          license_key: 'RS-BIZ-ENTERPRISE-2026',
          app_version: '1.0.0',
        }),
      });

      // Now validate
      const validatePayload = {
        installation_id: 'INST-BIZ-9001',
        device_id: 'DEV-DESKTOP-01',
        license_key: 'RS-BIZ-ENTERPRISE-2026',
      };

      const response = await fetch(`${baseUrl}/licenses/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(validatePayload),
      });

      expect(response.status).toBe(200);
      const data: any = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('VALID');
      expect(data.data.is_active).toBe(true);
    });
  });

  describe('5. Client TelemetryService Integration & Offline Resilience', () => {
    let machineIdService: MachineIdService;
    let telemetryService: TelemetryService;

    beforeEach(() => {
      machineIdService = new MachineIdService();
      telemetryService = new TelemetryService(machineIdService, baseUrl);
    });

    it('should send registration via TelemetryService client', async () => {
      const res = await telemetryService.registerInstallation({
        installation_id: 'INST-BIZ-9001',
        device_id: 'DEV-DESKTOP-01',
      });

      expect(res).not.toBeNull();
      expect(res?.success).toBe(true);
      expect(res?.data?.installation_id).toBe('INST-BIZ-9001');
    });

    it('should send store profile sync via TelemetryService client', async () => {
      const res = await telemetryService.syncStoreProfile({
        store_name: 'Apex Mega Supermarket',
        owner_name: 'Rajesh Kumar',
      });

      expect(res).not.toBeNull();
      expect(res?.success).toBe(true);
      expect(res?.data?.store_name).toBe('Apex Mega Supermarket');
    });

    it('should activate and validate license via TelemetryService client', async () => {
      const actRes = await telemetryService.activateLicenseOnline('RS-BIZ-ENTERPRISE-2026');
      expect(actRes?.success).toBe(true);
      expect(actRes?.status).toBe('VALID');

      const valRes = await telemetryService.validateLicenseOnline('RS-BIZ-ENTERPRISE-2026');
      expect(valRes?.success).toBe(true);
      expect(valRes?.status).toBe('VALID');
    });

    it('should handle offline server gracefully without throwing errors', async () => {
      // Point client to non-existent server port
      const offlineService = new TelemetryService(machineIdService, 'http://127.0.0.1:59999/api/inventory/v1');

      const regRes = await offlineService.registerInstallation();
      expect(regRes).toBeNull(); // Gracefully returned null

      const storeRes = await offlineService.syncStoreProfile({ store_name: 'Offline Test Store' });
      expect(storeRes).toBeNull();

      const actRes = await offlineService.activateLicenseOnline('RS-TEST-KEY');
      expect(actRes).toBeNull();

      const valRes = await offlineService.validateLicenseOnline('RS-TEST-KEY');
      expect(valRes).toBeNull();
    });
  });
});
