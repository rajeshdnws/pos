import { describe, it, expect } from 'vitest';
import { PasswordService } from '../../packages/business/src/utils/password';

describe('PasswordService Unit Tests', () => {
  it('should successfully hash and verify passwords', async () => {
    const plain = 'StrongPass123!';
    const hash = await PasswordService.hash(plain);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(plain);
    expect(hash.startsWith('$2')).toBe(true);

    const isValid = await PasswordService.verify(plain, hash);
    expect(isValid).toBe(true);

    const isInvalid = await PasswordService.verify('WrongPassword123!', hash);
    expect(isInvalid).toBe(false);
  });

  it('should validate strong passwords according to policy', () => {
    // Valid passwords
    expect(PasswordService.validatePasswordPolicy('Admin@123').isValid).toBe(true);
    expect(PasswordService.validatePasswordPolicy('Retail#2026').isValid).toBe(true);
    expect(PasswordService.validatePasswordPolicy('Passw0rdSecure').isValid).toBe(true);
  });

  it('should reject passwords that do not meet minimum length requirement', () => {
    const res = PasswordService.validatePasswordPolicy('Abc1!');
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('Password must be at least 8 characters long.');
  });

  it('should reject passwords missing uppercase letters', () => {
    const res = PasswordService.validatePasswordPolicy('password123');
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('Password must contain at least one uppercase letter.');
  });

  it('should reject passwords missing lowercase letters', () => {
    const res = PasswordService.validatePasswordPolicy('PASSWORD123');
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('Password must contain at least one lowercase letter.');
  });

  it('should reject passwords missing numeric digits', () => {
    const res = PasswordService.validatePasswordPolicy('PasswordSecure');
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('Password must contain at least one number.');
  });

  it('should return multiple validation errors for completely weak passwords', () => {
    const res = PasswordService.validatePasswordPolicy('abc');
    expect(res.isValid).toBe(false);
    expect(res.errors.length).toBeGreaterThanOrEqual(3);
  });
});
