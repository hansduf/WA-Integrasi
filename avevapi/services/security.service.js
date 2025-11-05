// services/security.service.js
import db from '../lib/database.js';
import { AUDIT_EVENTS } from '../utils/audit.utils.js';

/**
 * Security Monitoring Service
 * Provides security analytics, monitoring, and threat detection
 */

/**
 * Get failed login attempts in time window
 * @param {number} minutes - Time window in minutes (default: 60)
 * @returns {object} - Failed login statistics
 */
export function getFailedLoginAttempts(minutes = 60) {
  try {
    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    
    const failedLogins = db.db.prepare(`
      SELECT 
        user_id,
        action,
        details,
        ip_address,
        user_agent,
        timestamp
      FROM audit_logs
      WHERE action = ?
        AND timestamp > ?
      ORDER BY timestamp DESC
    `).all(AUDIT_EVENTS.LOGIN_FAILED, since);

    // Group by IP address
    const byIP = {};
    const byUser = {};
    
    failedLogins.forEach(log => {
      // By IP
      if (!byIP[log.ip_address]) {
        byIP[log.ip_address] = {
          count: 0,
          attempts: []
        };
      }
      byIP[log.ip_address].count++;
      byIP[log.ip_address].attempts.push({
        timestamp: log.timestamp,
        user_agent: log.user_agent,
        details: log.details
      });

      // By User
      if (log.user_id) {
        if (!byUser[log.user_id]) {
          byUser[log.user_id] = {
            count: 0,
            attempts: []
          };
        }
        byUser[log.user_id].count++;
        byUser[log.user_id].attempts.push({
          timestamp: log.timestamp,
          ip_address: log.ip_address,
          user_agent: log.user_agent
        });
      }
    });

    // Find suspicious IPs (more than 5 failed attempts)
    const suspiciousIPs = Object.entries(byIP)
      .filter(([ip, data]) => data.count >= 5)
      .map(([ip, data]) => ({
        ip_address: ip,
        attempt_count: data.count,
        last_attempt: data.attempts[0].timestamp
      }));

    return {
      success: true,
      stats: {
        total_failed: failedLogins.length,
        unique_ips: Object.keys(byIP).length,
        unique_users: Object.keys(byUser).length,
        suspicious_ips: suspiciousIPs.length,
        time_window_minutes: minutes
      },
      failed_by_ip: byIP,
      failed_by_user: byUser,
      suspicious_ips: suspiciousIPs,
      recent_attempts: failedLogins.slice(0, 20) // Last 20 attempts
    };
  } catch (error) {
    console.error('Get failed login attempts error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to retrieve failed login attempts'
    };
  }
}

/**
 * Get active sessions
 * @returns {object} - Active sessions list
 */
export function getActiveSessions() {
  try {
    const sessions = db.db.prepare(`
      SELECT 
        s.id,
        s.user_id,
        u.username,
        u.full_name,
        s.expires_at,
        s.created_at,
        s.ip_address,
        s.user_agent,
        s.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.is_active = 1
        AND s.expires_at > datetime('now')
      ORDER BY s.created_at DESC
    `).all();

    // Group by user
    const byUser = {};
    sessions.forEach(session => {
      if (!byUser[session.user_id]) {
        byUser[session.user_id] = {
          username: session.username,
          full_name: session.full_name,
          sessions: []
        };
      }
      byUser[session.user_id].sessions.push({
        session_id: session.id,
        created_at: session.created_at,
        expires_at: session.expires_at,
        ip_address: session.ip_address,
        user_agent: session.user_agent
      });
    });

    return {
      success: true,
      stats: {
        total_active_sessions: sessions.length,
        unique_users: Object.keys(byUser).length
      },
      sessions,
      sessions_by_user: byUser
    };
  } catch (error) {
    console.error('Get active sessions error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to retrieve active sessions'
    };
  }
}

/**
 * Get locked accounts
 * @returns {object} - Locked accounts list
 */
export function getLockedAccounts() {
  try {
    const lockedUsers = db.db.prepare(`
      SELECT 
        id,
        username,
        full_name,
        email,
        login_attempts,
        locked_until,
        last_login
      FROM users
      WHERE locked_until IS NOT NULL
        AND locked_until > datetime('now')
      ORDER BY locked_until DESC
    `).all();

    return {
      success: true,
      stats: {
        total_locked: lockedUsers.length
      },
      locked_accounts: lockedUsers.map(user => ({
        user_id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        login_attempts: user.login_attempts,
        locked_until: user.locked_until,
        last_login: user.last_login,
        time_remaining_minutes: Math.ceil(
          (new Date(user.locked_until) - new Date()) / (1000 * 60)
        )
      }))
    };
  } catch (error) {
    console.error('Get locked accounts error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to retrieve locked accounts'
    };
  }
}

/**
 * Unlock user account manually
 * @param {string} userId - User ID to unlock
 * @param {string} unlockedBy - ID of admin unlocking the account
 * @param {string} ipAddress - IP address
 * @param {string} userAgent - User agent
 * @returns {Promise<object>} - Result
 */
export async function unlockAccount(userId, unlockedBy, ipAddress, userAgent) {
  try {
    // Check if user exists and is locked
    const user = db.preparedStatements.getUserById.get(userId);
    
    if (!user) {
      return {
        success: false,
        error: 'user_not_found',
        message: 'User not found'
      };
    }

    if (!user.locked_until || new Date(user.locked_until) <= new Date()) {
      return {
        success: false,
        error: 'not_locked',
        message: 'User account is not locked'
      };
    }

    // Unlock account
    db.preparedStatements.updateUserLoginAttempts.run(0, null, userId);

    // Log account unlock
    await db.preparedStatements.insertAuditLog.run(
      userId,
      AUDIT_EVENTS.ACCOUNT_UNLOCKED,
      JSON.stringify({ unlocked_by: unlockedBy, previous_attempts: user.login_attempts }),
      ipAddress,
      userAgent
    );

    return {
      success: true,
      message: 'Account unlocked successfully',
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name
      }
    };
  } catch (error) {
    console.error('Unlock account error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to unlock account'
    };
  }
}

/**
 * Terminate specific session
 * @param {string} sessionId - Session ID to terminate
 * @param {string} terminatedBy - ID of user terminating the session
 * @param {string} reason - Reason for termination
 * @param {string} ipAddress - IP address
 * @param {string} userAgent - User agent
 * @returns {Promise<object>} - Result
 */
export async function terminateSession(sessionId, terminatedBy, reason, ipAddress, userAgent) {
  try {
    // Get session info
    const session = db.preparedStatements.getSessionById.get(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'session_not_found',
        message: 'Session not found'
      };
    }

    if (!session.is_active) {
      return {
        success: false,
        error: 'session_inactive',
        message: 'Session is already inactive'
      };
    }

    // Invalidate session
    db.preparedStatements.invalidateSession.run(sessionId);

    // Log session termination
    await db.preparedStatements.insertAuditLog.run(
      session.user_id,
      AUDIT_EVENTS.SESSION_TERMINATED,
      JSON.stringify({ 
        terminated_by: terminatedBy,
        session_id: sessionId,
        reason: reason || 'Manual termination'
      }),
      ipAddress,
      userAgent
    );

    return {
      success: true,
      message: 'Session terminated successfully',
      session: {
        session_id: sessionId,
        user_id: session.user_id
      }
    };
  } catch (error) {
    console.error('Terminate session error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to terminate session'
    };
  }
}

/**
 * Get security dashboard overview
 * @returns {object} - Security metrics
 */
export function getSecurityOverview() {
  try {
    // Get various security metrics
    const failedLogins = getFailedLoginAttempts(60); // Last hour
    const activeSessions = getActiveSessions();
    const lockedAccounts = getLockedAccounts();

    // Get total users
    const allUsers = db.preparedStatements.getAllUsers.all();
    const activeUsers = allUsers.filter(u => u.is_active);
    
    // Get recent suspicious activities
    const suspiciousActivities = db.db.prepare(`
      SELECT 
        user_id,
        action,
        details,
        ip_address,
        user_agent,
        timestamp
      FROM audit_logs
      WHERE action = ?
      ORDER BY timestamp DESC
      LIMIT 10
    `).all(AUDIT_EVENTS.SUSPICIOUS_ACTIVITY);

    // Calculate security score (0-100)
    let securityScore = 100;
    
    // Deduct points for security issues
    if (failedLogins.stats.total_failed > 10) securityScore -= 10;
    if (failedLogins.stats.suspicious_ips > 0) securityScore -= 15;
    if (lockedAccounts.stats.total_locked > 0) securityScore -= 5;
    if (suspiciousActivities.length > 5) securityScore -= 10;
    
    // Get audit log statistics
    const auditStats = db.db.prepare(`
      SELECT 
        action,
        COUNT(*) as count
      FROM audit_logs
      WHERE timestamp > datetime('now', '-24 hours')
      GROUP BY action
      ORDER BY count DESC
    `).all();

    return {
      success: true,
      overview: {
        security_score: Math.max(0, securityScore),
        total_users: allUsers.length,
        active_users: activeUsers.length,
        inactive_users: allUsers.length - activeUsers.length,
        locked_accounts: lockedAccounts.stats.total_locked,
        active_sessions: activeSessions.stats.total_active_sessions,
        failed_logins_last_hour: failedLogins.stats.total_failed,
        suspicious_ips: failedLogins.stats.suspicious_ips,
        suspicious_activities: suspiciousActivities.length
      },
      failed_logins: {
        last_hour: failedLogins.stats.total_failed,
        unique_ips: failedLogins.stats.unique_ips,
        suspicious_ips: failedLogins.suspicious_ips
      },
      sessions: {
        active: activeSessions.stats.total_active_sessions,
        unique_users: activeSessions.stats.unique_users
      },
      locked_accounts: lockedAccounts.locked_accounts,
      suspicious_activities: suspiciousActivities,
      audit_activity_24h: auditStats
    };
  } catch (error) {
    console.error('Get security overview error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to retrieve security overview'
    };
  }
}

/**
 * Get audit logs with filters
 * @param {object} filters - Filter options
 * @param {string} filters.userId - Filter by user ID
 * @param {string} filters.action - Filter by action type
 * @param {string} filters.startDate - Filter by start date
 * @param {string} filters.endDate - Filter by end date
 * @param {number} filters.page - Page number
 * @param {number} filters.limit - Items per page
 * @returns {object} - Audit logs with pagination
 */
export function getAuditLogs(filters = {}) {
  try {
    const {
      userId,
      action,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = filters;

    // Build query dynamically
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }

    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY timestamp DESC';

    // Get all matching logs
    const allLogs = db.db.prepare(query).all(...params);

    // Calculate pagination
    const total = allLogs.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    
    // Slice for pagination
    const logs = allLogs.slice(offset, offset + limit);

    return {
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        userId,
        action,
        startDate,
        endDate
      }
    };
  } catch (error) {
    console.error('Get audit logs error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to retrieve audit logs'
    };
  }
}

/**
 * Cleanup expired sessions (should be run periodically)
 * @returns {object} - Cleanup result
 */
export function cleanupExpiredSessions() {
  try {
    const result = db.preparedStatements.deleteExpiredSessions.run();
    
    return {
      success: true,
      deleted_count: result.changes,
      message: `Cleaned up ${result.changes} expired session(s)`
    };
  } catch (error) {
    console.error('Cleanup expired sessions error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to cleanup expired sessions'
    };
  }
}

export default {
  getFailedLoginAttempts,
  getActiveSessions,
  getLockedAccounts,
  unlockAccount,
  terminateSession,
  getSecurityOverview,
  getAuditLogs,
  cleanupExpiredSessions
};
