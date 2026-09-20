import { describe, expect, it } from 'vitest';
import {
  MessageTemplateService,
  SUPPORTED_PLACEHOLDERS,
} from '../../packages/business/src/services/communication/template.service';
import {
  encryptSecret,
  decryptSecret,
  maskSecret,
} from '../../packages/business/src/utils/credential-crypto';

describe('Communication Templates & Credential Crypto - Unit Tests', () => {
  describe('Template Placeholder Interpolation', () => {
    // Instantiating with null prisma for pure static/in-memory interpolation
    const templateService = new MessageTemplateService(null as any);

    it('interpolates single and multiple placeholders correctly', () => {
      const templateText = 'Hello {{customer_name}}, welcome to {{business_name}}! Use {{coupon_code}} for {{discount_value}} off.';
      const values = {
        customer_name: 'Rajesh Kumar',
        business_name: 'RS Retail Hub',
        coupon_code: 'FESTIVE25',
        discount_value: '25%',
      };

      const result = templateService.interpolate(templateText, values);
      expect(result).toBe('Hello Rajesh Kumar, welcome to RS Retail Hub! Use FESTIVE25 for 25% off.');
    });

    it('is case-insensitive for placeholder names', () => {
      const templateText = 'Hi {{CUSTOMER_NAME}}, your code is {{Coupon_Code}}.';
      const values = {
        customer_name: 'Priya Sharma',
        coupon_code: 'SAVE100',
      };

      const result = templateService.interpolate(templateText, values);
      expect(result).toBe('Hi Priya Sharma, your code is SAVE100.');
    });

    it('leaves missing variables intact in the template body', () => {
      const templateText = 'Hello {{customer_name}}, your code is {{coupon_code}} expiring on {{valid_until}}.';
      const values = {
        customer_name: 'Vikram Singh',
      };

      const result = templateService.interpolate(templateText, values);
      expect(result).toContain('Vikram Singh');
      expect(result).toContain('{{coupon_code}}');
      expect(result).toContain('{{valid_until}}');
    });

    it('extracts placeholders properly from template strings', () => {
      const templateText = 'Dear {{customer_name}}, get {{discount_value}} off at {{business_name}} until {{valid_until}}.';
      const extracted = templateService.extractPlaceholders(templateText);
      expect(extracted).toEqual([
        '{{customer_name}}',
        '{{discount_value}}',
        '{{business_name}}',
        '{{valid_until}}',
      ]);
    });

    it('verifies standard supported placeholders list', () => {
      expect(SUPPORTED_PLACEHOLDERS).toContain('{{customer_name}}');
      expect(SUPPORTED_PLACEHOLDERS).toContain('{{business_name}}');
      expect(SUPPORTED_PLACEHOLDERS).toContain('{{coupon_code}}');
      expect(SUPPORTED_PLACEHOLDERS).toContain('{{discount_value}}');
      expect(SUPPORTED_PLACEHOLDERS).toContain('{{minimum_purchase}}');
      expect(SUPPORTED_PLACEHOLDERS).toContain('{{valid_from}}');
      expect(SUPPORTED_PLACEHOLDERS).toContain('{{valid_until}}');
    });
  });

  describe('Credential Encryption & Masking (AES-256-GCM)', () => {
    const companyId = 'company_test_abc_123';

    it('encrypts and decrypts secret credentials in a round-trip', () => {
      const originalPassword = 'super-secret-smtp-password-999$#@!';
      const encrypted = encryptSecret(originalPassword, companyId);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(originalPassword);
      // Ciphertext should contain IV, tag, and ciphertext parts separated by colons
      expect(encrypted.split(':').length).toBe(3);

      const decrypted = decryptSecret(encrypted, companyId);
      expect(decrypted).toBe(originalPassword);
    });

    it('different companies produce different ciphertexts for the same secret', () => {
      const secret = 'identical-token-value';
      const enc1 = encryptSecret(secret, 'company-alpha');
      const enc2 = encryptSecret(secret, 'company-beta');

      expect(enc1).not.toBe(enc2);
      // Company Beta cannot decrypt Company Alpha's cipher
      const crossDecrypted = decryptSecret(enc1, 'company-beta');
      expect(crossDecrypted).toBe(''); // Fails authentication tag check safely
    });

    it('masks secrets securely for UI presentation', () => {
      expect(maskSecret('my-secret-key-12345')).toBe('••••••••');
      expect(maskSecret('')).toBe('');
      expect(maskSecret(null)).toBe('');
      expect(maskSecret(undefined)).toBe('');
    });
  });
});
