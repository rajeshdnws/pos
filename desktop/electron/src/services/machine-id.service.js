"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MachineIdService = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
class MachineIdService {
    cachedInstallationId = null;
    storageFilePath;
    constructor() {
        let appDataDir;
        try {
            appDataDir = electron_1.app.getPath('userData');
        }
        catch {
            appDataDir = path.join(os.homedir(), '.rs-inventory');
        }
        this.storageFilePath = path.join(appDataDir, 'machine-id.json');
    }
    /**
     * Get or generate the machine installation ID
     */
    getInstallationId() {
        if (this.cachedInstallationId) {
            return this.cachedInstallationId;
        }
        // 1. Try reading existing saved ID from disk
        try {
            if (fs.existsSync(this.storageFilePath)) {
                const raw = fs.readFileSync(this.storageFilePath, 'utf8');
                const data = JSON.parse(raw);
                if (data && data.installationId && typeof data.installationId === 'string') {
                    this.cachedInstallationId = data.installationId;
                    return this.cachedInstallationId;
                }
            }
        }
        catch {
            // Fall through to regeneration
        }
        // 2. Generate fingerprint from hardware & OS attributes
        const networkInterfaces = os.networkInterfaces();
        const macAddresses = [];
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
            fs.writeFileSync(this.storageFilePath, JSON.stringify({
                installationId: formattedId,
                generatedAt: new Date().toISOString(),
                platform: os.platform(),
                arch: os.arch(),
            }, null, 2), 'utf8');
        }
        catch {
            // Non-fatal if filesystem write fails; memory cache holds it
        }
        return formattedId;
    }
    /**
     * Build complete Activation Request DTO for offline licensing
     */
    generateActivationRequest(customerName = 'Valued Client', edition = 'SOLO') {
        const installationId = this.getInstallationId();
        let appVersion = '1.0.0';
        try {
            appVersion = electron_1.app.getVersion();
        }
        catch {
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
exports.MachineIdService = MachineIdService;
