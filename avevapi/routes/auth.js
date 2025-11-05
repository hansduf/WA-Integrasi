// routes/auth.js
import express from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.middleware.js';
import { loginRateLimiter, sanitizeBody, validateContentType } from '../middleware/security.middleware.js';
import { getCurrentUser, login, logout } from '../services/auth.service.js';
import { getClientIP, getCookieOptions, getUserAgent } from '../utils/security.utils.js';
import { loginSchema, validate } from '../utils/validation.utils.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * User login endpoint
 * Body: { username, password, rememberMe }
 */
router.post('/login',
  loginRateLimiter,
  validateContentType,
  sanitizeBody,
  async (req, res) => {
    // Validate request body
    const { error: validationError, value } = validate(req.body, loginSchema);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: validationError
      });
    }
    
    // Use validated data
    req.body = value;
    try {
      const { username, password, rememberMe } = req.body;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);

      const result = await login(username, password, ipAddress, userAgent, rememberMe);

      if (!result.success) {
        // Set loginSuccess flag for rate limiter skip
        req.loginSuccess = false;

        return res.status(401).json({
          success: false,
          error: result.error,
          message: result.message,
          attemptsLeft: result.attemptsLeft,
          lockedUntil: result.lockedUntil
        });
      }

      // Set loginSuccess flag to skip rate limiter on next request
      req.loginSuccess = true;

      // Set access token in httpOnly cookie
      res.cookie('accessToken', result.accessToken, getCookieOptions());

      // Set refresh token if rememberMe is true
      if (result.refreshToken) {
        res.cookie('refreshToken', result.refreshToken, {
          ...getCookieOptions(),
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
      }

      // Return user info and tokens
      res.json({
        success: true,
        message: 'Login successful',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt
      });

    } catch (error) {
      console.error('Login route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'An error occurred during login'
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * User logout endpoint
 */
router.post('/logout',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const sessionId = req.sessionId; // Set by authenticateToken middleware
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);

      const result = await logout(userId, sessionId, ipAddress, userAgent);

      // Clear cookies
      res.clearCookie('accessToken', getCookieOptions());
      res.clearCookie('refreshToken', getCookieOptions());

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Logout route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'An error occurred during logout'
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me',
  authenticateToken,
  (req, res) => {
    try {
      const result = getCurrentUser(req.user.id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error,
          message: result.message
        });
      }

      res.json({
        success: true,
        user: result.user,
        session: result.session
      });

    } catch (error) {
      console.error('Get current user route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to retrieve user information'
      });
    }
  }
);

/**
 * GET /api/auth/check
 * Check authentication status (optional auth)
 */
router.get('/check',
  optionalAuth,
  (req, res) => {
    res.json({
      success: true,
      authenticated: !!req.user,
      user: req.user || null
    });
  }
);

/**
 * GET /api/auth/validate-session
 * Validate current session for polling (lightweight check)
 */
router.get('/validate-session',
  authenticateToken,
  (req, res) => {
    try {
      // If we reach here, token is valid and session exists
      // authenticateToken middleware already did all the validation
      res.json({
        success: true,
        valid: true,
        user: req.user,
        sessionId: req.sessionId
      });
    } catch (error) {
      console.error('Validate session route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to validate session'
      });
    }
  }
);

export default router;
