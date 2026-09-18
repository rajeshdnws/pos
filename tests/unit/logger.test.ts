import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LoggerService } from '../../desktop/electron/src/services/logger.service';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('LoggerService', () => {
  const tempLogFile = path.join(os.tmpdir(), `test_app_log_${Date.now()}.log`);

  beforeEach(() => {
    LoggerService.resetInstance();
  });

  afterEach(() => {
    if (fs.existsSync(tempLogFile)) {
      try {
        fs.unlinkSync(tempLogFile);
      } catch {
        // ignore
      }
    }
  });

  it('should sanitize sensitive keys from metadata', () => {
    const logger = LoggerService.getInstance();
    const payload = {
      user: 'admin',
      password: 'superSecretPassword123',
      creditCard: '1234-5678-9012-3456',
      token: 'jwt.token.here',
      nested: {
        apiKey: 'sk_live_xyz',
        publicField: 'safeValue',
      },
    };

    const sanitized = logger.sanitize(payload) as Record<string, any>;
    expect(sanitized.user).toBe('admin');
    expect(sanitized.password).toBe('***REDACTED***');
    expect(sanitized.creditCard).toBe('***REDACTED***');
    expect(sanitized.token).toBe('***REDACTED***');
    expect(sanitized.nested.apiKey).toBe('***REDACTED***');
    expect(sanitized.nested.publicField).toBe('safeValue');
  });

  it('should write logs to file', () => {
    const logger = LoggerService.getInstance();
    logger.setLogFilePath(tempLogFile);
    logger.setMinLevel('DEBUG');

    logger.info('Test log message written to disk', { testId: 101 });

    expect(fs.existsSync(tempLogFile)).toBe(true);
    const content = fs.readFileSync(tempLogFile, 'utf8');
    expect(content).toContain('Test log message written to disk');
    expect(content).toContain('[INFO]');
    expect(content).toContain('101');
  });
});
