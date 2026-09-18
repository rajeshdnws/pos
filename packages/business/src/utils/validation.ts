export class ValidationUtils {
  /**
   * GSTIN format: 15 alphanumeric characters
   * Format: 2 digits (state code) + 5 letters (PAN) + 4 digits + 1 letter + 1 char (1-9/A-Z) + 'Z' + 1 checksum char
   */
  private static readonly GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  /**
   * PAN format: 10 characters (5 uppercase letters, 4 digits, 1 uppercase letter)
   */
  private static readonly PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

  /**
   * Indian PIN Code: 6 digits (cannot start with 0)
   */
  private static readonly PIN_REGEX = /^[1-9][0-9]{5}$/;

  /**
   * Indian Mobile Number: 10 digits starting with 6, 7, 8, or 9
   */
  private static readonly MOBILE_REGEX = /^[6-9][0-9]{9}$/;

  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  public static isValidGSTIN(gstin: string): boolean {
    if (!gstin) return false;
    const clean = gstin.trim().toUpperCase();
    if (!this.GSTIN_REGEX.test(clean)) {
      return false;
    }
    const stateCode = parseInt(clean.substring(0, 2), 10);
    // Valid Indian state codes are 01-38 and 97 (Other Territory)
    if ((stateCode < 1 || stateCode > 38) && stateCode !== 97) {
      return false;
    }
    return true;
  }

  public static isValidPAN(pan: string): boolean {
    if (!pan) return false;
    return this.PAN_REGEX.test(pan.trim().toUpperCase());
  }

  public static isValidPIN(pin: string): boolean {
    if (!pin) return false;
    return this.PIN_REGEX.test(pin.trim());
  }

  public static isValidPinCode(pin: string): boolean {
    return this.isValidPIN(pin);
  }

  public static isValidPincode(pin: string): boolean {
    return this.isValidPIN(pin);
  }

  public static isValidMobile(mobile: string): boolean {
    if (!mobile) return false;
    const clean = mobile.replace(/[^0-9]/g, '');
    return this.MOBILE_REGEX.test(clean);
  }

  public static isValidEmail(email: string): boolean {
    if (!email) return false;
    return this.EMAIL_REGEX.test(email.trim());
  }
}
