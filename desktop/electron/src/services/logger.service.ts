import { LogLevel } from '@rs-inventory/types';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigService } from './config.service.js';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
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

export class LoggerService {
  private static instance: LoggerService | null = null;
  private logFilePath: string = '';
  private minLevel: LogLevel = 'INFO';

  private constructor() {
    const config = ConfigService.getInstance();
    this.logFilePath = config.getLogPath();
    const configuredLevel = config.getLogLevel().toUpperCase() as LogLevel;
    this.minLevel = LOG_LEVEL_PRIORITY[configuredLevel] ? configuredLevel : 'INFO';
  }

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public static resetInstance(): void {
    LoggerService.instance = null;
  }

  public setLogFilePath(filePath: string): void {
    this.logFilePath = filePath;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  public debug(message: string, meta?: unknown): void {
    this.log('DEBUG', message, meta);
  }

  public info(message: string, meta?: unknown): void {
    this.log('INFO', message, meta);
  }

  public warn(message: string, meta?: unknown): void {
    this.log('WARN', message, meta);
  }

  public error(message: string, errorOrMeta?: unknown): void {
    this.log('ERROR', message, errorOrMeta);
  }

  public log(level: LogLevel, message: string, meta?: unknown): void {
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
    } else if (level === 'WARN') {
      console.warn(logLine.trim());
    } else {
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
    } catch (writeErr) {
      console.error('Failed to write to application log file:', writeErr);
    }
  }

  /**
   * Recursively sanitizes sensitive information from log payloads.
   */
  public sanitize(data: unknown): unknown {
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
      const sanitizedObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
        if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
          sanitizedObj[key] = '***REDACTED***';
        } else if (typeof value === 'object' && value !== null) {
          sanitizedObj[key] = this.sanitize(value);
        } else {
          sanitizedObj[key] = value;
        }
      }
      return sanitizedObj;
    }

    return data;
  }
}
