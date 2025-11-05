// routes/security.js
import express from 'express';
import { requireAdmin } from '../middleware/admin.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { apiRateLimiter, strictRateLimiter } from '../middleware/security.middleware.js';
import {
    cleanupExpiredSessions,
    getActiveSessions,
    getAuditLogs,
    getFailedLoginAttempts,
    getLockedAccounts,
    getSecurityOverview,
    terminateSession,
    unlockAccount
} from '../services/security.service.js';
import { getClientIP, getUserAgent } from '../utils/security.utils.js';

const router = express.Router();

// All routes require authentication and admin access
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/security/overview
 * Get security dashboard overview (admin only)
 */
router.get('/overview',
  apiRateLimiter,
  (req, res) => {
    try {
      const result = getSecurityOverview();

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Security overview route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to retrieve security overview'
      });
    }
  }
);

/**
 * GET /api/security/failed-logins
 * Get failed login attempts (admin only)
 * Query: minutes (time window)
 */
router.get('/failed-logins',
  apiRateLimiter,
  (req, res) => {
    try {
      const minutes = parseInt(req.query.minutes) || 60;
      const result = getFailedLoginAttempts(minutes);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Failed logins route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to retrieve failed login attempts'
      });
    }
  }
);

/**
 * GET /api/security/sessions
 * Get active sessions (admin only)
 */
router.get('/sessions',
  apiRateLimiter,
  (req, res) => {
    try {
      const result = getActiveSessions();

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Active sessions route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to retrieve active sessions'
      });
    }
  }
);

/**
 * DELETE /api/security/sessions/:sessionId
 * Terminate specific session (admin only)
 * Body: { reason }
 */
router.delete('/sessions/:sessionId',
  strictRateLimiter,
  async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const terminatedBy = req.user.id;
      const reason = req.body.reason || 'Manual termination by admin';
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);

      const result = await terminateSession(
        sessionId,
        terminatedBy,
        reason,
        ipAddress,
        userAgent
      );

      if (!result.success) {
        const statusCode = result.error === 'session_not_found' ? 404 :
                          result.error === 'session_inactive' ? 400 : 500;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Terminate session route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to terminate session'
      });
    }
  }
);

/**
 * GET /api/security/locked-accounts
 * Get locked accounts (admin only)
 */
router.get('/locked-accounts',
  apiRateLimiter,
  (req, res) => {
    try {
      const result = getLockedAccounts();

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Locked accounts route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to retrieve locked accounts'
      });
    }
  }
);

/**
 * POST /api/security/unlock/:userId
 * Unlock user account (admin only)
 */
router.post('/unlock/:userId',
  strictRateLimiter,
  async (req, res) => {
    try {
      const userId = req.params.userId;
      const unlockedBy = req.user.id;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);

      const result = await unlockAccount(userId, unlockedBy, ipAddress, userAgent);

      if (!result.success) {
        const statusCode = result.error === 'user_not_found' ? 404 :
                          result.error === 'not_locked' ? 400 : 500;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Unlock account route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to unlock account'
      });
    }
  }
);

/**
 * GET /api/security/audit-logs
 * Get audit logs with filters (admin only)
 * Query: userId, action, startDate, endDate, page, limit
 */
router.get('/audit-logs',
  apiRateLimiter,
  (req, res) => {
    try {
      const filters = {
        userId: req.query.userId,
        action: req.query.action,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      const result = getAuditLogs(filters);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Audit logs route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to retrieve audit logs'
      });
    }
  }
);

/**
 * POST /api/security/cleanup-sessions
 * Cleanup expired sessions (admin only)
 */
router.post('/cleanup-sessions',
  strictRateLimiter,
  (req, res) => {
    try {
      const result = cleanupExpiredSessions();

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Cleanup sessions route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to cleanup sessions'
      });
    }
  }
);

export default router;
