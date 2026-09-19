"use strict";
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
exports.LoggerService = void 0;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const config_service_js_1 = require("./config.service.js");
const LOG_LEVEL_PRIORITY = {
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
};
const SENSITIVE_KEYS = [
    'password',
    'passwordhash',
    'token',
    'secret',
    'apikey',
    'cardnumber',
    'cvv',
    'pin',
    'creditcard',
    'authorization',
];
class LoggerService {
    static instance = null;
    logFilePath = '';
    minLevel = 'INFO';
    constructor() {
        const config = config_service_js_1.ConfigService.getInstance();
        this.logFilePath = config.getLogPath();
        const configuredLevel = config.getLogLevel().toUpperCase();
        this.minLevel = LOG_LEVEL_PRIORITY[configuredLevel] ? configuredLevel : 'INFO';
    }
    static getInstance() {
        if (!LoggerService.instance) {
            LoggerService.instance = new LoggerService();
        }
        return LoggerService.instance;
    }
    static resetInstance() {
        LoggerService.instance = null;
    }
    setLogFilePath(filePath) {
        this.logFilePath = filePath;
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    setMinLevel(level) {
        this.minLevel = level;
    }
    debug(message, meta) {
        this.log('DEBUG', message, meta);
    }
    info(message, meta) {
        this.log('INFO', message, meta);
    }
    warn(message, meta) {
        this.log('WARN', message, meta);
    }
    error(message, errorOrMeta) {
        this.log('ERROR', message, errorOrMeta);
    }
    log(level, message, meta) {
        if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
            return;
        }
        const timestamp = new Date().toISOString();
        const sanitizedMeta = meta !== undefined ? this.sanitize(meta) : undefined;
        const metaStr = sanitizedMeta ? ` | Meta: ${JSON.stringify(sanitizedMeta)}` : '';
        const logLine = `[${timestamp}] [${level}] ${message}${metaStr}\n`;
        // Console output
        if (level === 'ERROR') {
            console.error(logLine.trim());
        }
        else if (level === 'WARN') {
            console.warn(logLine.trim());
        }
        else {
            console.log(logLine.trim());
        }
        // Append to local log file
        try {
            if (this.logFilePath) {
                const dir = path.dirname(this.logFilePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.appendFileSync(this.logFilePath, logLine, 'utf8');
            }
        }
        catch (writeErr) {
            console.error('Failed to write to application log file:', writeErr);
        }
    }
    /**
     * Recursively sanitizes sensitive information from log payloads.
     */
    sanitize(data) {
        if (data === null || data === undefined) {
            return data;
        }
        if (data instanceof Error) {
            return {
                name: data.name,
                message: data.message,
                stack: data.stack,
            };
        }
        if (Array.isArray(data)) {
            return data.map((item) => this.sanitize(item));
        }
        if (typeof data === 'object') {
            const sanitizedObj = {};
            for (const [key, value] of Object.entries(data)) {
                const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
                if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
                    sanitizedObj[key] = '***REDACTED***';
                }
                else if (typeof value === 'object' && value !== null) {
                    sanitizedObj[key] = this.sanitize(value);
                }
                else {
                    sanitizedObj[key] = value;
                }
            }
            return sanitizedObj;
        }
        return data;
    }
}
exports.LoggerService = LoggerService;
