import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  DatabaseError,
  NotFoundError,
  PermissionError,
  BusinessRuleError,
} from '../../packages/business/src/errors/app.error';

describe('Application Error Hierarchy', () => {
  it('should instantiate AppError with code, message, details and timestamp', () => {
    const error = new AppError('CUSTOM_CODE', 'Custom test message', { field: 'username' });
    expect(error.code).toBe('CUSTOM_CODE');
    expect(error.message).toBe('Custom test message');
    expect(error.details).toEqual({ field: 'username' });
    expect(error.timestamp).toBeDefined();

    const json = error.toJSON();
    expect(json.code).toBe('CUSTOM_CODE');
    expect(json.message).toBe('Custom test message');
    expect(json.details).toEqual({ field: 'username' });
  });

  it('should instantiate ValidationError correctly', () => {
    const error = new ValidationError('Invalid product SKU', { sku: 'SKU#@1' });
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid product SKU');
    expect(error.details).toEqual({ sku: 'SKU#@1' });
  });

  it('should instantiate DatabaseError correctly', () => {
    const error = new DatabaseError('Failed to execute query', { query: 'SELECT 1' });
    expect(error.code).toBe('DATABASE_ERROR');
    expect(error.message).toBe('Failed to execute query');
  });

  it('should instantiate NotFoundError correctly with identifier', () => {
    const error = new NotFoundError('Product', 'prod-123');
    expect(error.code).toBe('NOT_FOUND_ERROR');
    expect(error.message).toBe("Product with identifier 'prod-123' was not found.");
  });

  it('should instantiate PermissionError correctly', () => {
    const error = new PermissionError();
    expect(error.code).toBe('PERMISSION_ERROR');
    expect(error.message).toContain('permission');
  });

  it('should instantiate BusinessRuleError correctly', () => {
    const error = new BusinessRuleError('Cannot issue invoice for inactive customer');
    expect(error.code).toBe('BUSINESS_RULE_ERROR');
    expect(error.message).toBe('Cannot issue invoice for inactive customer');
  });
});
