import { describe, it, expect } from 'vitest';
import { ValidationUtils } from '../../packages/business/src/utils/validation';

describe('ValidationUtils Indian Retail Unit Tests', () => {
  describe('GSTIN Validation', () => {
    it('should validate correctly formatted 15-character Indian GSTINs', () => {
      expect(ValidationUtils.isValidGSTIN('29ABCDE1234F1Z5')).toBe(true);
      expect(ValidationUtils.isValidGSTIN('07AAAAA0000A1Z5')).toBe(true);
      expect(ValidationUtils.isValidGSTIN('27AAACR5055K1Z1')).toBe(true);
    });

    it('should reject invalid Indian GSTINs', () => {
      expect(ValidationUtils.isValidGSTIN('INVALID_GSTIN')).toBe(false);
      expect(ValidationUtils.isValidGSTIN('29ABCDE1234F1Z')).toBe(false); // 14 chars
      expect(ValidationUtils.isValidGSTIN('29ABCDE1234F1Z5A')).toBe(false); // 16 chars
      expect(ValidationUtils.isValidGSTIN('99ABCDE1234F1Z5')).toBe(false); // Invalid state code 99
      expect(ValidationUtils.isValidGSTIN('00ABCDE1234F1Z5')).toBe(false); // State code 00
      expect(ValidationUtils.isValidGSTIN('')).toBe(false);
    });
  });

  describe('PAN Validation', () => {
    it('should validate correctly formatted 10-character Indian PANs', () => {
      expect(ValidationUtils.isValidPAN('ABCDE1234F')).toBe(true);
      expect(ValidationUtils.isValidPAN('AAAAA0000A')).toBe(true);
      expect(ValidationUtils.isValidPAN('AAACR5055K')).toBe(true);
    });

    it('should reject invalid Indian PANs', () => {
      expect(ValidationUtils.isValidPAN('ABCDE1234')).toBe(false); // 9 chars
      expect(ValidationUtils.isValidPAN('ABCDE12345')).toBe(false); // ends with number
      expect(ValidationUtils.isValidPAN('12345ABCDE')).toBe(false); // reversed
      expect(ValidationUtils.isValidPAN('')).toBe(false);
    });
  });

  describe('PIN Code Validation', () => {
    it('should validate 6-digit Indian PIN codes', () => {
      expect(ValidationUtils.isValidPinCode('560001')).toBe(true);
      expect(ValidationUtils.isValidPinCode('110001')).toBe(true);
      expect(ValidationUtils.isValidPinCode('400001')).toBe(true);
    });

    it('should reject invalid PIN codes', () => {
      expect(ValidationUtils.isValidPinCode('010001')).toBe(false); // cannot start with 0
      expect(ValidationUtils.isValidPinCode('56000')).toBe(false); // 5 digits
      expect(ValidationUtils.isValidPinCode('5600011')).toBe(false); // 7 digits
      expect(ValidationUtils.isValidPinCode('56000A')).toBe(false); // letters
      expect(ValidationUtils.isValidPinCode('')).toBe(false);
    });
  });

  describe('Mobile Number Validation', () => {
    it('should validate 10-digit Indian mobile numbers starting with 6, 7, 8, 9', () => {
      expect(ValidationUtils.isValidMobile('9876543210')).toBe(true);
      expect(ValidationUtils.isValidMobile('8123456789')).toBe(true);
      expect(ValidationUtils.isValidMobile('7012345678')).toBe(true);
      expect(ValidationUtils.isValidMobile('6234567890')).toBe(true);
    });

    it('should reject invalid mobile numbers', () => {
      expect(ValidationUtils.isValidMobile('5123456789')).toBe(false); // starts with 5
      expect(ValidationUtils.isValidMobile('987654321')).toBe(false); // 9 digits
      expect(ValidationUtils.isValidMobile('98765432100')).toBe(false); // 11 digits
      expect(ValidationUtils.isValidMobile('98765ABCDE')).toBe(false); // letters
      expect(ValidationUtils.isValidMobile('')).toBe(false);
    });
  });

  describe('Email Validation', () => {
    it('should validate standard email formats', () => {
      expect(ValidationUtils.isValidEmail('admin@retailstore.in')).toBe(true);
      expect(ValidationUtils.isValidEmail('user.name+tag@example.com')).toBe(true);
      expect(ValidationUtils.isValidEmail('support@rs-inventory.co.in')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(ValidationUtils.isValidEmail('plainaddress')).toBe(false);
      expect(ValidationUtils.isValidEmail('@missinguser.com')).toBe(false);
      expect(ValidationUtils.isValidEmail('missingdomain@.com')).toBe(false);
      expect(ValidationUtils.isValidEmail('')).toBe(false);
    });
  });
});
