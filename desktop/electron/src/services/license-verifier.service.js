"use strict";
/**
 * RS Inventory - Electron License Verifier Service
 * Company: RS ORANGE TECH PVT LTD
 *
 * Bridges Electron IPC, local filesystem dialogs, machine fingerprinting,
 * and the Business Layer LicenseService.
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
exports.LicenseVerifierService = exports.DEFAULT_PUBLIC_KEY_PEM = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
// Default embedded public key for RS ORANGE TECH PVT LTD (ensures zero asset packaging failure)
exports.DEFAULT_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3SR9uo+ba9/6cJmak5uQ
Qf8rQgafKoY5wkP8a9+uJDX9cDIz1fH9nckRe2Lcv7KDgZ7kywbYcos5HRssTr73
xUe98k5jfyxDk9+2uqk9JaAqFSH/efHDMmn4GhjU7w6nlZm0xdS2NET9esiSS33B
VCeWPMjBG8itlR7DBvxxoAEtzg6tTQVBLK0u59atQgHerTVoyinYfgbTwKOwiMVe
SJJulyu10CSu1PnQC7BTVlESpDHdLa4D5tuQ5Ghvaz0ubeeoT5MwsgCO6xEL80Vk
iT+diYb5u1aGXUX+nxnrRDNDSoJDjdlCGFF3DLdsP6scyCzRN7oCfaoKJ5630zba
CQIDAQAB
-----END PUBLIC KEY-----`;
class LicenseVerifierService {
    licenseService;
    machineIdService;
    publicKeyPem;
    localLicenseBackupPath;
    constructor(licenseService, machineIdService) {
        this.licenseService = licenseService;
        this.machineIdService = machineIdService;
        // Load public key from asset file or fallback to embedded constant
        this.publicKeyPem = this.loadPublicKey();
        // AppData backup path for disaster-recovery/offline persistence
        let userDataDir;
        try {
            userDataDir = electron_1.app.getPath('userData');
        }
        catch {
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
    async initialize() {
        try {
            const status = await this.licenseService.getLicenseStatus();
            // If DB has no active license, check local redundant backup
            if (status.status === 'NOT_ACTIVATED' && fs.existsSync(this.localLicenseBackupPath)) {
                try {
                    const raw = fs.readFileSync(this.localLicenseBackupPath, 'utf8');
                    const signed = JSON.parse(raw);
                    await this.licenseService.activateLicense(signed, this.machineIdService.getInstallationId(), this.publicKeyPem);
                }
                catch {
                    // Backup file unreadable or invalid; proceed with unactivated
                }
            }
        }
        catch {
            // Startup error handled gracefully
        }
    }
    loadPublicKey() {
        try {
            const assetPath = path.join(__dirname, '..', 'assets', 'license_public.pem');
            if (fs.existsSync(assetPath)) {
                return fs.readFileSync(assetPath, 'utf8');
            }
        }
        catch {
            // Fall through to embedded constant
        }
        return exports.DEFAULT_PUBLIC_KEY_PEM;
    }
    async getLicenseStatus() {
        return this.licenseService.getLicenseStatus();
    }
    async generateActivationRequest(customerName) {
        return this.machineIdService.generateActivationRequest(customerName || 'RS ORANGE TECH Client', 'SOLO');
    }
    async exportActivationRequest(customerName, targetPath) {
        const request = this.generateActivationRequest(customerName);
        const defaultFileName = `RS_ACTIVATION_REQUEST_${request.installationId}.rsreq`;
        let destinationPath = targetPath;
        if (!destinationPath) {
            const focusedWindow = electron_1.BrowserWindow.getFocusedWindow();
            const saveResult = await electron_1.dialog.showSaveDialog(focusedWindow || undefined, {
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
    async chooseLicenseFile() {
        const focusedWindow = electron_1.BrowserWindow.getFocusedWindow();
        const openResult = await electron_1.dialog.showOpenDialog(focusedWindow || undefined, {
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
    async importLicenseFile(filePath) {
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
    async activateLicenseContent(licenseFileContent) {
        let signed;
        try {
            signed = JSON.parse(licenseFileContent);
        }
        catch {
            throw new Error('Invalid license certificate: Unable to parse JSON.');
        }
        const currentInstallationId = this.machineIdService.getInstallationId();
        const status = await this.licenseService.activateLicense(signed, currentInstallationId, this.publicKeyPem);
        // Write redundant backup to AppData/license
        try {
            const dir = path.dirname(this.localLicenseBackupPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.localLicenseBackupPath, JSON.stringify(signed, null, 2), 'utf8');
        }
        catch {
            // Non-fatal if redundant backup write fails
        }
        return status;
    }
    async deactivateLicense() {
        const result = await this.licenseService.deactivateLicense();
        // Clean up local redundant backup
        try {
            if (fs.existsSync(this.localLicenseBackupPath)) {
                fs.unlinkSync(this.localLicenseBackupPath);
            }
        }
        catch {
            // Non-fatal
        }
        return result;
    }
}
exports.LicenseVerifierService = LicenseVerifierService;
