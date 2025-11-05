// middleware/security.middleware.js
import rateLimit from 'express-rate-limit';
import { auth } from '../config/index.js';

/**
 * Rate limiter for login attempts
 * Limits login attempts per IP address
 */
export const loginRateLimiter = rateLimit({
  windowMs: auth.rateLimit.windowMinutes * 60 * 1000, // Convert to milliseconds
  max: auth.rateLimit.maxAttempts, // Max requests per window
  message: {
    success: false,
    error: 'too_many_requests',
    message: `Too many login attempts. Please try again after ${auth.rateLimit.windowMinutes} minutes.`,
    retryAfter: auth.rateLimit.windowMinutes * 60
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Use IP address as key
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  },
  // Custom handler
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'too_many_requests',
      message: `Too many login attempts. Please try again after ${auth.rateLimit.windowMinutes} minutes.`,
      retryAfter: auth.rateLimit.windowMinutes * 60
    });
  },
  // Skip successful requests (only count failures)
  skip: (req, res) => {
    // This will be set by the login route if login is successful
    return res.locals.loginSuccess === true;
  }
});

/**
 * General API rate limiter
 * More lenient limits for general API usage
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per 15 minutes per IP
  message: {
    success: false,
    error: 'too_many_requests',
    message: 'Too many requests. Please try again later.',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  }
});

/**
 * Strict rate limiter for sensitive operations
 * Very strict limits for operations like password reset, user deletion
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 requests per hour
  message: {
    success: false,
    error: 'too_many_requests',
    message: 'Too many attempts for this operation. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use both IP and user ID if authenticated
    const ip = req.ip || 'unknown';
    const userId = req.user?.id || 'anonymous';
    return `${ip}-${userId}`;
  }
});

/**
 * Middleware to sanitize request body
 * Removes potentially dangerous characters
 */
export function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Remove potential XSS attacks
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .trim();
      }
    });
  }
  next();
}

/**
 * Middleware to validate content type
 */
export function validateContentType(req, res, next) {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        success: false,
        error: 'invalid_content_type',
        message: 'Content-Type must be application/json'
      });
    }
  }
  next();
}

export default {
  loginRateLimiter,
  apiRateLimiter,
  strictRateLimiter,
  sanitizeBody,
  validateContentType
};
