// lib/errors.js

export class DatabaseError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

export class MigrationError extends Error {
  constructor(message, entityType = null, entityId = null) {
    super(message);
    this.name = 'MigrationError';
    this.entityType = entityType;
    this.entityId = entityId;
  }
}

export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export function handleDatabaseError(error, context = '') {
  console.error(`Database error${context ? ` in ${context}` : ''}:`, error.message);

  if (error.code) {
    console.error('Error code:', error.code);
  }

  if (error.originalError) {
    console.error('Original error:', error.originalError.message);
  }

  throw new DatabaseError(
    `Database operation failed${context ? ` in ${context}` : ''}: ${error.message}`,
    error
  );
}

export function handleMigrationError(error, entityType, entityId) {
  console.error(`Migration error for ${entityType} ${entityId}:`, error.message);
  throw new MigrationError(error.message, entityType, entityId);
}

export function handleValidationError(error, field = null) {
  console.error(`Validation error${field ? ` for field ${field}` : ''}:`, error.message);
  throw new ValidationError(error.message, field);
}