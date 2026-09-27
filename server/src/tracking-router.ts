/**
 * RS Inventory - Telemetry & License Router
 * Company: RS ORANGE TECH PVT LTD
 * 
 * Handles incoming API endpoints:
 * - POST /api/inventory/v1/installations/register
 * - POST /api/inventory/v1/installations/store-profile
 * - POST /api/inventory/v1/licenses/activate
 * - POST /api/inventory/v1/licenses/validate
 */

import { IncomingMessage, ServerResponse } from 'http';
import { TrackingStore } from './tracking-store.js';
import {
  InstallationRegisterRequestDTO,
  StoreProfileTelemetryRequestDTO,
  LicenseActivateApiRequestDTO,
  LicenseValidateApiRequestDTO,
} from '@rs-inventory/types';

export class TrackingRouter {
  private store: TrackingStore;

  constructor(store: TrackingStore) {
    this.store = store;
  }

  public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname.replace(/\/$/, '');
    const method = req.method?.toUpperCase();

    // Set standard CORS & JSON headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');

    if (method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (method !== 'POST') {
      this.sendResponse(res, 450, {
        success: false,
        message: `Method ${method} not allowed on endpoint ${pathname}`,
      });
      return;
    }

    try {
      const bodyText = await this.readBodyText(req);
      let body: any = {};
      if (bodyText) {
        try {
          body = JSON.parse(bodyText);
        } catch {
          this.sendResponse(res, 400, {
            success: false,
            message: 'Invalid JSON payload in request body',
          });
          return;
        }
      }

      switch (pathname) {
        case '/api/inventory/v1/installations/register':
          return this.handleRegisterInstallation(body, res);

        case '/api/inventory/v1/installations/store-profile':
          return this.handleStoreProfile(body, res);

        case '/api/inventory/v1/licenses/activate':
          return this.handleLicenseActivate(body, res);

        case '/api/inventory/v1/licenses/validate':
          return this.handleLicenseValidate(body, res);

        default:
          this.sendResponse(res, 404, {
            success: false,
            message: `Endpoint ${pathname} not found`,
          });
          return;
      }
    } catch (err: any) {
      this.sendResponse(res, 500, {
        success: false,
        message: err.message || 'Internal server error',
      });
    }
  }

  private handleRegisterInstallation(body: InstallationRegisterRequestDTO, res: ServerResponse): void {
    if (!body.installation_id || !body.device_id) {
      this.sendResponse(res, 400, {
        success: false,
        message: 'Missing required fields: installation_id and device_id are required.',
      });
      return;
    }

    const record = this.store.registerInstallation(body);

    this.sendResponse(res, 200, {
      success: true,
      message: 'Installation registered successfully',
      data: {
        installation_id: record.installation_id,
        device_id: record.device_id,
        status: 'REGISTERED',
        registered_at: record.registered_at,
      },
    });
  }

  private handleStoreProfile(body: StoreProfileTelemetryRequestDTO, res: ServerResponse): void {
    if (!body.installation_id || !body.store_name) {
      this.sendResponse(res, 400, {
        success: false,
        message: 'Missing required fields: installation_id and store_name are required.',
      });
      return;
    }

    const record = this.store.saveStoreProfile(body);

    this.sendResponse(res, 200, {
      success: true,
      message: 'Store profile updated successfully',
      data: {
        installation_id: record.installation_id,
        store_name: record.store_name,
        updated_at: record.updated_at,
      },
    });
  }

  private handleLicenseActivate(body: LicenseActivateApiRequestDTO, res: ServerResponse): void {
    if (!body.installation_id || !body.device_id || !body.license_key) {
      this.sendResponse(res, 400, {
        success: false,
        message: 'Missing required fields: installation_id, device_id, and license_key are required.',
      });
      return;
    }

    const record = this.store.activateLicense(body);

    this.sendResponse(res, 200, {
      success: true,
      status: 'VALID',
      message: 'License activated successfully',
      data: {
        installation_id: record.installation_id,
        device_id: record.device_id,
        license_key: record.license_key,
        edition: record.edition,
        product: record.product,
        activated_at: record.activated_at,
        expires_at: record.expires_at,
      },
    });
  }

  private handleLicenseValidate(body: LicenseValidateApiRequestDTO, res: ServerResponse): void {
    if (!body.installation_id || !body.license_key) {
      this.sendResponse(res, 400, {
        success: false,
        message: 'Missing required fields: installation_id and license_key are required.',
      });
      return;
    }

    const deviceId = body.device_id || 'UNKNOWN-DEVICE';
    const validation = this.store.validateLicense(body.installation_id, deviceId, body.license_key);

    if (!validation.isValid) {
      this.sendResponse(res, 400, {
        success: false,
        status: 'INVALID',
        message: validation.message,
      });
      return;
    }

    this.sendResponse(res, 200, {
      success: true,
      status: 'VALID',
      message: validation.message,
      data: {
        installation_id: body.installation_id,
        device_id: deviceId,
        license_key: body.license_key,
        is_active: true,
        validated_at: new Date().toISOString(),
      },
    });
  }

  private readBodyText(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        resolve(data);
      });
      req.on('error', (err) => {
        reject(err);
      });
    });
  }

  private sendResponse(res: ServerResponse, statusCode: number, payload: any): void {
    res.statusCode = statusCode;
    res.end(JSON.stringify(payload, null, 2));
  }
}
