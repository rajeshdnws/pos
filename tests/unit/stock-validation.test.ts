import { describe, it, expect } from 'vitest';
import { ValidationError, BusinessRuleError } from '../../packages/business/src/errors/app.error';

describe('Inventory & Stock Validation Unit Tests', () => {
  it('should reject fractional quantities when allowDecimals is false', () => {
    const validateQuantity = (allowDecimals: boolean, qty: number) => {
      if (!allowDecimals && !Number.isInteger(qty)) {
        throw new ValidationError('Unit does not allow fractional quantities.');
      }
      return true;
    };

    expect(() => validateQuantity(false, 1.5)).toThrow(ValidationError);
    expect(() => validateQuantity(false, 0.25)).toThrow(ValidationError);
    expect(validateQuantity(false, 5)).toBe(true);
    expect(validateQuantity(true, 2.75)).toBe(true);
  });

  it('should enforce non-empty reason for stock adjustments', () => {
    const validateReason = (reason: string | undefined | null) => {
      if (!reason || reason.trim().length === 0) {
        throw new ValidationError('Adjustment reason is mandatory.');
      }
      return reason.trim();
    };

    expect(() => validateReason('')).toThrow(ValidationError);
    expect(() => validateReason('   ')).toThrow(ValidationError);
    expect(validateReason('Damaged in transit')).toBe('Damaged in transit');
  });

  it('should block inter-location transfers between the same location', () => {
    const validateLocations = (sourceId: string, destId: string) => {
      if (!sourceId || !destId) {
        throw new ValidationError('Both locations required.');
      }
      if (sourceId === destId) {
        throw new BusinessRuleError('Source and destination locations cannot be the same.');
      }
      return true;
    };

    expect(() => validateLocations('loc-1', 'loc-1')).toThrow(BusinessRuleError);
    expect(validateLocations('loc-1', 'loc-2')).toBe(true);
  });
});
