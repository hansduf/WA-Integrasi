// utils/validation.utils.js
import Joi from 'joi';

/**
 * Validation Utilities for Input Validation
 */

/**
 * Validate password complexity
 * - Minimum 8 characters
 * - Must contain at least one letter
 * - Must contain at least one number
 */
export const passwordSchema = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-zA-Z])(?=.*\d)/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one letter and one number',
    'any.required': 'Password is required'
  });

/**
 * Validate username
 * - 3-50 characters
 * - Alphanumeric only
 */
export const usernameSchema = Joi.string()
  .min(3)
  .max(50)
  .alphanum()
  .required()
  .messages({
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username cannot exceed 50 characters',
    'string.alphanum': 'Username must contain only letters and numbers',
    'any.required': 'Username is required'
  });

/**
 * Validate email
 */
export const emailSchema = Joi.string()
  .email()
  .optional()
  .allow(null, '')
  .messages({
    'string.email': 'Invalid email format'
  });

/**
 * Validate full name (required)
 */
export const fullNameSchema = Joi.string()
  .min(2)
  .max(100)
  .required()
  .messages({
    'string.min': 'Full name must be at least 2 characters long',
    'string.max': 'Full name cannot exceed 100 characters',
    'any.required': 'Full name is required'
  });

/**
 * Validate full name (optional - for updates)
 */
export const fullNameOptionalSchema = Joi.string()
  .min(2)
  .max(100)
  .optional()
  .allow(null, '')
  .messages({
    'string.min': 'Full name must be at least 2 characters long',
    'string.max': 'Full name cannot exceed 100 characters'
  });

/**
 * Login validation schema
 */
export const loginSchema = Joi.object({
  username: usernameSchema,
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  }),
  rememberMe: Joi.boolean().optional().default(false)
});

/**
 * Create user validation schema
 */
export const createUserSchema = Joi.object({
  username: usernameSchema,
  password: passwordSchema,
  full_name: fullNameSchema,
  email: emailSchema
});

/**
 * Update user validation schema
 */
export const updateUserSchema = Joi.object({
  full_name: fullNameOptionalSchema,
  email: emailSchema,
  is_active: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Validate request body against schema
 * @param {object} data - Data to validate
 * @param {object} schema - Joi schema
 * @returns {object} - { error, value }
 */
export function validate(data, schema) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return { error: errors, value: null };
  }

  return { error: null, value };
}

/**
 * Validate password complexity (manual check)
 * @param {string} password - Password to validate
 * @returns {object} - { valid, errors }
 */
export function validatePassword(password) {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return { valid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Password must contain at least one letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize string input (prevent XSS)
 * @param {string} input - Input string
 * @returns {string} - Sanitized string
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID string
 * @returns {boolean} - True if valid UUID
 */
export function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export default {
  passwordSchema,
  usernameSchema,
  emailSchema,
  fullNameSchema,
  loginSchema,
  createUserSchema,
  updateUserSchema,
  validate,
  validatePassword,
  sanitizeInput,
  isValidUUID
};
