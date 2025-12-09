// utils/security.utils.js
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { auth } from '../config/index.js';

/**
 * Security Utilities for Authentication System
 */

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(auth.bcrypt.rounds);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if password matches
 */
export async function verifyPassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * Generate JWT access token
 * @param {object} payload - Token payload (userId, username, role, etc.)
 * @returns {string} - JWT token
 */
export function generateAccessToken(payload) {
  try {
    return jwt.sign(payload, auth.jwt.secret, {
      expiresIn: auth.jwt.expiresIn,
      issuer: 'aveva-pi-system',
      audience: 'aveva-pi-client'
    });
  } catch (error) {
    console.error('Error generating access token:', error);
    throw new Error('Failed to generate access token');
  }
}

/**
 * Generate JWT refresh token
 * @param {object} payload - Token payload (userId, type)
 * @returns {string} - JWT refresh token
 */
export function generateRefreshToken(payload) {
  try {
    return jwt.sign(
      { ...payload, type: 'refresh' },
      auth.jwt.refreshSecret,
      {
        expiresIn: auth.jwt.refreshExpiresIn,
        issuer: 'aveva-pi-system',
        audience: 'aveva-pi-client'
      }
    );
  } catch (error) {
    console.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
}

/**
 * Verify JWT access token
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded token payload or null if invalid
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, auth.jwt.secret, {
      issuer: 'aveva-pi-system',
      audience: 'aveva-pi-client'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { error: 'expired', message: 'Token has expired' };
    } else if (error.name === 'JsonWebTokenError') {
      return { error: 'invalid', message: 'Invalid token' };
    }
    return null;
  }
}

/**
 * Verify JWT refresh token
 * @param {string} token - JWT refresh token
 * @returns {object|null} - Decoded token payload or null if invalid
 */
export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, auth.jwt.refreshSecret, {
      issuer: 'aveva-pi-system',
      audience: 'aveva-pi-client'
    });
    
    if (decoded.type !== 'refresh') {
      return { error: 'invalid', message: 'Not a refresh token' };
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { error: 'expired', message: 'Refresh token has expired' };
    }
    return null;
  }
}

/**
 * Generate secure random token (for session tokens)
 * @param {number} length - Token length in bytes (default 32)
 * @returns {string} - Hex encoded token
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash token using SHA256 (for storing session tokens)
 * @param {string} token - Token to hash
 * @returns {string} - Hashed token
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Calculate session expiration time
 * @param {number} minutes - Minutes from now (default from config)
 * @returns {Date} - Expiration datetime
 */
export function calculateSessionExpiry(minutes = auth.session.timeoutMinutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Calculate account lock expiration time
 * @returns {Date} - Lock expiration datetime
 */
export function calculateLockExpiry() {
  return new Date(Date.now() + auth.accountLock.durationMinutes * 60 * 1000);
}

/**
 * Check if account is currently locked
 * @param {Date|string|null} lockedUntil - Lock expiration datetime
 * @returns {boolean} - True if account is locked
 */
export function isAccountLocked(lockedUntil) {
  if (!lockedUntil) return false;
  return new Date(lockedUntil) > new Date();
}

/**
 * Sanitize user object (remove sensitive fields)
 * @param {object} user - User object from database
 * @returns {object} - Sanitized user object
 */
export function sanitizeUser(user) {
  if (!user) return null;
  
  const { password_hash, ...sanitized } = user;
  return sanitized;
}

/**
 * Extract client IP from request
 * @param {object} req - Express request object
 * @returns {string} - Client IP address
 */
export function getClientIP(req) {
  return req.ip || 
         req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection?.remoteAddress || 
         'unknown';
}

/**
 * Extract user agent from request
 * @param {object} req - Express request object
 * @returns {string} - User agent string
 */
export function getUserAgent(req) {
  return req.headers['user-agent'] || 'unknown';
}

/**
 * Generate secure cookie options
 * @param {boolean} rememberMe - Whether this is a long-lived cookie
 * @returns {object} - Cookie options
 */
export function getCookieOptions(rememberMe = false) {
  // Detect HTTPS from environment variables
  // Only trust explicit HTTPS=true flag (for cookies to work via HTTP in development)
  // HTTPS=true: explicit flag for HTTPS protocol
  const isHttps = process.env.HTTPS === 'true';
  
  console.log('🍪 getCookieOptions called:');
  console.log('   HTTPS:', process.env.HTTPS);
  console.log('   → isHttps calculated:', isHttps);
  console.log('   → Will use: secure=' + isHttps + ', sameSite=' + (isHttps ? 'none' : 'lax'));
  
  const options = {
    httpOnly: true, // Prevent XSS attacks
    secure: isHttps, // Only secure for HTTPS (production/ngrok)
    sameSite: isHttps ? 'none' : 'lax', // 'none' for HTTPS cross-domain, 'lax' for localhost
    maxAge: rememberMe 
      ? 7 * 24 * 60 * 60 * 1000  // 7 days for remember me
      : auth.session.timeoutMinutes * 60 * 1000, // Session timeout
    path: '/'
  };

  // For cross-domain scenarios (ngrok), don't set domain to allow subdomain flexibility
  // Browser will use the domain from the response automatically
  if (isHttps) {
    // Only set domain in HTTPS if needed
    // options.domain = 'your-production-domain.com';
  }

  return options;
}

export default {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateSecureToken,
  hashToken,
  calculateSessionExpiry,
  calculateLockExpiry,
  isAccountLocked,
  sanitizeUser,
  getClientIP,
  getUserAgent,
  getCookieOptions
};
