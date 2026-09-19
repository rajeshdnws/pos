import { SerializedAppError } from '@rs-inventory/types';

export class AppError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  public readonly timestamp: string;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(): SerializedAppError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super('DATABASE_ERROR', message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(entityName: string, identifier?: string | number) {
    const detail = identifier ? ` with identifier '${identifier}'` : '';
    super('NOT_FOUND_ERROR', `${entityName}${detail} was not found.`);
  }
}

export class PermissionError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action.') {
    super('PERMISSION_ERROR', message);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, details?: unknown) {
    super('BUSINESS_RULE_ERROR', message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT_ERROR', message, details);
  }
}
