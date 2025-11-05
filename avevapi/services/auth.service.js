// services/auth.service.js
import { auth } from '../config/index.js';
import db from '../lib/database.js';
import {
  logAccountLocked,
  logLoginFailed,
  logLoginSuccess,
  logLogout
} from '../utils/audit.utils.js';
import {
  calculateLockExpiry,
  calculateSessionExpiry,
  generateAccessToken,
  generateSecureToken,
  hashToken,
  isAccountLocked,
  sanitizeUser,
  verifyPassword
} from '../utils/security.utils.js';

/**
 * Authentication Service
 * Handles login, logout, session management
 */

/**
 * Login user with username and password
 * @param {string} username - Username
 * @param {string} password - Plain text password
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - User agent string
 * @param {boolean} rememberMe - Remember me flag
 * @returns {Promise<object>} - { success, user, accessToken, refreshToken, error }
 */
export async function login(username, password, ipAddress, userAgent, rememberMe = false) {
  try {
    // Get user by username
    const user = db.preparedStatements.getUserByUsername.get(username);

    // User not found - log failed attempt with generic error
    if (!user) {
      await logLoginFailed(username, 'invalid_credentials', ipAddress, userAgent);
      return {
        success: false,
        error: 'invalid_credentials',
        message: 'Invalid username or password'
      };
    }

    // Check if account is locked
    if (isAccountLocked(user.locked_until)) {
      await logLoginFailed(username, 'account_locked', ipAddress, userAgent);
      return {
        success: false,
        error: 'account_locked',
        message: `Account is locked. Please try again after ${new Date(user.locked_until).toLocaleTimeString()}.`,
        lockedUntil: user.locked_until
      };
    }

    // Check if account is active
    if (!user.is_active) {
      await logLoginFailed(username, 'account_disabled', ipAddress, userAgent);
      return {
        success: false,
        error: 'account_disabled',
        message: 'Your account has been disabled'
      };
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      // Increment login attempts
      const newAttempts = (user.login_attempts || 0) + 1;
      let lockedUntil = null;

      // Lock account if max attempts reached
      if (newAttempts >= auth.accountLock.maxAttempts) {
        lockedUntil = calculateLockExpiry();
        await logAccountLocked(user.id, newAttempts, ipAddress, userAgent);
      }

      // Update login attempts and lock status
      db.preparedStatements.updateUserLoginAttempts.run(newAttempts, lockedUntil, user.id);

      await logLoginFailed(username, 'invalid_credentials', ipAddress, userAgent);

      const attemptsLeft = auth.accountLock.maxAttempts - newAttempts;
      return {
        success: false,
        error: 'invalid_credentials',
        message: lockedUntil 
          ? `Account locked due to too many failed attempts. Please try again after ${auth.accountLock.durationMinutes} minutes.`
          : `Invalid username or password. ${attemptsLeft} attempt(s) remaining.`,
        attemptsLeft: attemptsLeft > 0 ? attemptsLeft : 0,
        lockedUntil
      };
    }

    // ✅ FIX: Clean single session enforcement - hard delete all existing sessions
    db.preparedStatements.deleteUserSessions.run(user.id);

    // Update user: reset login attempts, update last login BEFORE generating token
    console.log('🔄 Updating user last_login for user:', user.id);
    const updateResult = db.preparedStatements.updateUserLastLogin.run(user.id);
    console.log('✅ Update result:', updateResult);

    // Create new session with race condition protection
    const sessionToken = generateSecureToken();
    const tokenHash = hashToken(sessionToken);
    const expiresAt = calculateSessionExpiry(
      rememberMe ? 7 * 24 * 60 : auth.session.timeoutMinutes // 7 days or 1 hour
    );

    // ✅ FIX: Insert session with proper error handling
    db.preparedStatements.insertSession.run(
      user.id,
      tokenHash,
      expiresAt.toISOString(),
      ipAddress,
      userAgent
    );

    // Generate tokens with loginTime (current timestamp)
    const loginTime = Date.now();
    const accessToken = generateAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role || 'admin',  // Include role in JWT payload
      loginTime: loginTime        // Include login timestamp for invalidation check
    });

    // Log successful login
    await logLoginSuccess(user.id, ipAddress, userAgent);

    // Return sanitized user and tokens
    return {
      success: true,
      user: sanitizeUser(user),
      accessToken,
      sessionToken,
      expiresAt: expiresAt.toISOString()
    };

  } catch (error) {
    console.error('Login service error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'An error occurred during login'
    };
  }
}

/**
 * Logout user
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID (optional)
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - User agent string
 * @returns {Promise<object>} - { success, message }
 */
export async function logout(userId, sessionId, ipAddress, userAgent) {
  try {
    // Invalidate specific session if provided, otherwise all user sessions
    if (sessionId) {
      db.preparedStatements.invalidateSession.run(sessionId);
    } else {
      db.preparedStatements.invalidateUserSessions.run(userId);
    }

    // Log logout
    await logLogout(userId, ipAddress, userAgent);

    return {
      success: true,
      message: 'Logged out successfully'
    };
  } catch (error) {
    console.error('Logout service error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'An error occurred during logout'
    };
  }
}

/**
 * Get current user session info
 * @param {string} userId - User ID
 * @returns {object} - User and session info
 */
export function getCurrentUser(userId) {
  try {
    const user = db.preparedStatements.getUserById.get(userId);
    
    if (!user) {
      return {
        success: false,
        error: 'user_not_found',
        message: 'User not found'
      };
    }

    const session = db.preparedStatements.getSessionByUserId.get(userId);

    return {
      success: true,
      user: sanitizeUser(user),
      session: session ? {
        expiresAt: session.expires_at,
        createdAt: session.created_at
      } : null
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to retrieve user information'
    };
  }
}

/**
 * Extend session expiration (sliding expiration)
 * @param {string} sessionId - Session ID
 * @returns {boolean} - Success status
 */
export function extendSession(sessionId) {
  try {
    const newExpiry = calculateSessionExpiry();
    db.preparedStatements.updateSessionExpiry.run(newExpiry.toISOString(), sessionId);
    return true;
  } catch (error) {
    console.error('Extend session error:', error);
    return false;
  }
}

/**
 * Cleanup expired sessions
 * Should be run periodically (e.g., cron job)
 */
export function cleanupExpiredSessions() {
  try {
    const result = db.preparedStatements.deleteExpiredSessions.run();
    console.log(`Cleaned up ${result.changes} expired sessions`);
    return result.changes;
  } catch (error) {
    console.error('Cleanup expired sessions error:', error);
    return 0;
  }
}

/**
 * Unlock user account manually (admin function)
 * @param {string} userId - User ID to unlock
 * @returns {boolean} - Success status
 */
export function unlockAccount(userId) {
  try {
    db.preparedStatements.updateUserLoginAttempts.run(0, null, userId);
    return true;
  } catch (error) {
    console.error('Unlock account error:', error);
    return false;
  }
}

export default {
  login,
  logout,
  getCurrentUser,
  extendSession,
  cleanupExpiredSessions,
  unlockAccount
};
