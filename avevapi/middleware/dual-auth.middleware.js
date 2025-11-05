// middleware/dual-auth.middleware.js
import { config } from '../config/index.js';
import { authenticateToken } from './auth.middleware.js';

/**
 * Dual Authentication Middleware
 * Supports both JWT (web users) and API Key (bot) authentication
 * 
 * Flow:
 * 1. Check if request has API Key → Use API Key validation
 * 2. Check if request has JWT Cookie/Header → Use JWT validation  
 * 3. No valid auth → Return 401
 */

/**
 * API Key validation middleware
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = config.api.key;

  console.log('🔑 API Key validation:', {
    hasApiKey: !!apiKey,
    keyValid: apiKey === validApiKey,
    endpoint: req.url,
    method: req.method
  });

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'Invalid or missing API key'
    });
  }

  // Set request source for logging
  req.authSource = 'api-key';
  req.user = { role: 'bot', source: 'api-key' };
  
  next();
};

/**
 * Dual authentication middleware
 * Handles both JWT and API Key authentication
 */
export function dualAuthMiddleware(req, res, next) {
  try {
    console.log('🔐 Dual auth middleware:', {
      url: req.url,
      method: req.method,
      hasApiKey: !!req.headers['x-api-key'],
      hasCookie: !!req.cookies?.accessToken,
      hasAuthHeader: !!req.headers.authorization
    });

    // Check for API Key first (bot requests)
    const hasApiKey = req.headers['x-api-key'];
    const hasJwtAuth = req.cookies?.accessToken || req.headers.authorization;

    if (hasApiKey && !hasJwtAuth) {
      // Bot request with API Key only
      console.log('🤖 Using API Key authentication');
      return validateApiKey(req, res, next);
    }
    
    if (hasJwtAuth) {
      // Web request with JWT
      console.log('🌐 Using JWT authentication');
      return authenticateToken(req, res, next);
    }

    // No valid authentication found
    console.log('❌ No valid authentication found');
    return res.status(401).json({
      success: false,
      error: 'authentication_required',
      message: 'Valid authentication required (JWT token or API key)'
    });

  } catch (error) {
    console.error('❌ Dual auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'authentication_error',
      message: 'Authentication system error'
    });
  }
}

/**
 * Export both middlewares for flexibility
 */
export { validateApiKey };
export default dualAuthMiddleware;