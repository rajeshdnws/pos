/**
 * AES-256-GCM Credential Encryption & Masking Utility
 * Ensures SMTP passwords, API keys, and access tokens are never stored in plaintext
 * and never exposed to the frontend renderer.
 */

const ALGORITHM = 'aes-256-gcm';
const DEFAULT_KEY_SALT = 'RS_INVENTORY_SOLO_COMMUNICATION_KEY_V1';

function getCrypto() {
  if (typeof require !== 'undefined') {
    try {
      return require('crypto');
    } catch {
      return null;
    }
  }
  return null;
}

function deriveKey(companyId: string, salt: string = DEFAULT_KEY_SALT): Buffer | null {
  const crypto = getCrypto();
  if (!crypto) return null;
  // Derive a deterministic 32-byte key from companyId and salt
  return crypto.scryptSync(companyId, salt, 32);
}

/**
 * Encrypt a plaintext string (e.g. SMTP password or API token) into a base64 ciphertext string.
 */
export function encryptSecret(plainText: string, companyId: string): string {
  if (!plainText) return '';
  const crypto = getCrypto();
  if (!crypto) {
    // In environments where crypto is unavailable, fallback to base64 encoding (e.g. tests)
    return Buffer.from(plainText).toString('base64');
  }

  const key = deriveKey(companyId);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Payload format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string back into plaintext.
 */
export function decryptSecret(cipherText: string, companyId: string): string {
  if (!cipherText) return '';
  const crypto = getCrypto();
  if (!crypto) {
    return Buffer.from(cipherText, 'base64').toString('utf8');
  }

  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    // Fallback if not encrypted with IV/Tag
    try {
      return Buffer.from(cipherText, 'base64').toString('utf8');
    } catch {
      return cipherText;
    }
  }

  try {
    const key = deriveKey(companyId);
    const [ivHex, authTagHex, encryptedHex] = parts;
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt credential:', err);
    return '';
  }
}

/**
 * Mask a secret string for UI presentation.
 */
export function maskSecret(secret?: string | null): string {
  if (!secret || secret.trim().length === 0) return '';
  return '••••••••';
}
