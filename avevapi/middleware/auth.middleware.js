// middleware/auth.middleware.js
import db from '../lib/database.js';
import { AUDIT_EVENTS, logAudit, logSuspiciousActivity } from '../utils/audit.utils.js';
import { getClientIP, getUserAgent, sanitizeUser, verifyAccessToken } from '../utils/security.utils.js';

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticateToken(req, res, next) {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies?.accessToken || 
                  req.headers.authorization?.replace('Bearer ', '');

    console.log('Token found:', !!token);
    console.log('Token length:', token?.length);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Authentication required'
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      // Clear invalid cookie and signal frontend to logout
      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
      
      res.setHeader('X-Auth-Cleared', 'true');
      
      return res.status(401).json({
        success: false,
        error: 'invalid_token',
        message: 'Invalid authentication token',
        shouldLogout: true
      });
    }

    // Check if token has error (expired or invalid)
    if (decoded.error) {
      // For expired tokens, this represents session expiry - log audit event
      if (decoded.error === 'expired') {
        // Get user info for audit logging (if possible)
        let userId = null;
        let userAgent = getUserAgent(req);
        let ipAddress = getClientIP(req);

        // Try to get user ID from token payload if available
        if (decoded.userId) {
          userId = decoded.userId;
        }

        await logAudit(AUDIT_EVENTS.SESSION_EXPIRED, {
          userId,
          details: {
            reason: 'jwt_token_expired',
            tokenExpiredAt: new Date().toISOString(),
            note: 'Session expired due to JWT token expiry (represents natural session expiry)'
          },
          ipAddress,
          userAgent
        });
      }

      // Clear invalid/expired cookie and signal frontend to logout
      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
      
      res.setHeader('X-Auth-Cleared', 'true');
      
      return res.status(401).json({
        success: false,
        error: decoded.error === 'expired' ? 'session_expired' : decoded.error,
        message: decoded.message,
        shouldLogout: true
      });
    }

    // Get user from database
    const user = db.preparedStatements.getUserById.get(decoded.userId);

    if (!user) {
      // User deleted but token still exists - clear cookie and signal logout
      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
      
      res.setHeader('X-Auth-Cleared', 'true');
      
      return res.status(401).json({
        success: false,
        error: 'user_not_found',
        message: 'User not found',
        shouldLogout: true
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'account_disabled',
        message: 'Your account has been disabled'
      });
    }

    // Check if user is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({
        success: false,
        error: 'account_locked',
        message: 'Your account is temporarily locked. Please try again later.'
      });
    }

    // Validate loginTime from JWT payload - check if user has logged in again after this token was issued
    if (decoded.loginTime) {
      // Check if user has logged in again after this token was issued
      // by comparing token's loginTime with user's last_login timestamp
      const userLastLogin = new Date(user.last_login);
      const tokenLoginTime = new Date(decoded.loginTime);
      
      if (userLastLogin > tokenLoginTime) {
        // User has logged in again after this token was issued - token is invalid
        res.clearCookie('accessToken', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/'
        });
        
        res.setHeader('X-Auth-Cleared', 'true');
        
        logSuspiciousActivity(
          user.id,
          'Token invalidated by newer login',
          getClientIP(req),
          getUserAgent(req)
        );
        
        return res.status(401).json({
          success: false,
          error: 'session_invalidated',
          message: 'You have been logged out from another device.',
          shouldLogout: true
        });
      }
    } else {
      // Legacy token without loginTime - fall back to basic session check
      // Check if user has active session
      const session = db.preparedStatements.getSessionByUserId.get(user.id);
      
      if (!session) {
        // No active session - clear invalid cookie and signal logout
        res.clearCookie('accessToken', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/'
        });
        
        res.setHeader('X-Auth-Cleared', 'true');
        
        logSuspiciousActivity(
          user.id,
          'Token valid but no active session',
          getClientIP(req),
          getUserAgent(req)
        );
        
        return res.status(401).json({
          success: false,
          error: 'session_expired',
          message: 'Your session has expired. Please login again.',
          shouldLogout: true
        });
      }

      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        // Session expired - log audit event, invalidate it, clear cookie, and signal logout
        await logAudit(AUDIT_EVENTS.SESSION_EXPIRED, {
          userId: user.id,
          details: {
            sessionId: session.id,
            expiredAt: session.expires_at,
            reason: 'session_expired_naturally'
          },
          ipAddress: getClientIP(req),
          userAgent: getUserAgent(req)
        });
        
        db.preparedStatements.invalidateSession.run(session.id);
        
        res.clearCookie('accessToken', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/'
        });
        
        res.setHeader('X-Auth-Cleared', 'true');
        
        return res.status(401).json({
          success: false,
          error: 'session_expired',
          message: 'Your session has expired. Please login again.',
          shouldLogout: true
        });
      }

      // Attach session to request
      req.sessionId = session.id;
    }

    // Attach sanitized user to request
    req.user = sanitizeUser(user);
    // Include role from JWT payload (all users are admin in current system)
    req.user.role = decoded.role || 'admin';

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Authentication error occurred'
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if missing
 */
export function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.accessToken || 
                  req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next();
    }

    const decoded = verifyAccessToken(token);

    if (decoded && !decoded.error) {
      const user = db.preparedStatements.getUserById.get(decoded.userId);
      if (user && user.is_active) {
        req.user = sanitizeUser(user);
      }
    }

    next();
  } catch (error) {
    // Fail silently for optional auth
    next();
  }
}

/**
 * Middleware to check if user is authenticated
 * Simpler version that just checks if req.user exists
 */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'Authentication required'
    });
  }
  next();
}

export default {
  authenticateToken,
  optionalAuth,
  requireAuth
};
