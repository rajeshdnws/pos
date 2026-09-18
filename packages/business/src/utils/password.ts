import bcrypt from 'bcryptjs';

export class PasswordService {
  private static readonly SALT_ROUNDS = 10;

  /**
   * Hashes a plaintext password using bcrypt with 10 salt rounds.
   */
  public static async hashPassword(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, this.SALT_ROUNDS);
  }

  public static async hash(plainText: string): Promise<string> {
    return this.hashPassword(plainText);
  }

  /**
   * Verifies a plaintext password against a stored bcrypt hash.
   */
  public static async verifyPassword(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }

  public static async verify(plainText: string, hash: string): Promise<boolean> {
    return this.verifyPassword(plainText, hash);
  }

  /**
   * Validates password strength policy:
   * Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number.
   */
  public static validatePasswordPolicy(password: string): {
    valid: boolean;
    isValid: boolean;
    message?: string;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long.');
    }
    if (!/[A-Z]/.test(password || '')) {
      errors.push('Password must contain at least one uppercase letter.');
    }
    if (!/[a-z]/.test(password || '')) {
      errors.push('Password must contain at least one lowercase letter.');
    }
    if (!/[0-9]/.test(password || '')) {
      errors.push('Password must contain at least one number.');
    }

    const valid = errors.length === 0;
    return {
      valid,
      isValid: valid,
      message: errors[0],
      errors,
    };
  }
}
