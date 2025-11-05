// utils/scheduler.utils.js
import db from '../lib/database.js';
import { cleanupExpiredSessions } from '../services/security.service.js';
import { AUDIT_EVENTS } from './audit.utils.js';

/**
 * Scheduler Utilities
 * Handles periodic tasks for security and maintenance
 */

let intervals = [];

/**
 * Start automatic session cleanup
 * Runs every 30 minutes
 */
export function startSessionCleanup() {
  console.log('🧹 Starting automatic session cleanup (every 30 minutes)...');
  
  // Run immediately on start
  cleanupExpiredSessions();
  
  // Then run every 30 minutes
  const interval = setInterval(() => {
    console.log('🧹 Running scheduled session cleanup...');
    const result = cleanupExpiredSessions();
    if (result.success && result.deleted_count > 0) {
      console.log(`✅ Cleaned up ${result.deleted_count} expired session(s)`);
    }
  }, 30 * 60 * 1000); // 30 minutes

  intervals.push({ name: 'session-cleanup', interval });
}

/**
 * Start automatic account unlock
 * Checks every 5 minutes for accounts that should be unlocked
 */
export function startAutoAccountUnlock() {
  console.log('🔓 Starting automatic account unlock (every 5 minutes)...');
  
  const interval = setInterval(() => {
    try {
      // Find accounts that are locked but lock period has expired
      const expiredLocks = db.db.prepare(`
        SELECT id, username, locked_until
        FROM users
        WHERE locked_until IS NOT NULL
          AND locked_until <= datetime('now')
      `).all();

      if (expiredLocks.length > 0) {
        console.log(`🔓 Auto-unlocking ${expiredLocks.length} account(s)...`);
        
        expiredLocks.forEach(user => {
          // Reset login attempts and clear lock
          db.preparedStatements.updateUserLoginAttempts.run(0, null, user.id);
          
          // Log auto unlock
          db.preparedStatements.insertAuditLog.run(
            user.id,
            AUDIT_EVENTS.ACCOUNT_UNLOCKED,
            JSON.stringify({ 
              reason: 'Automatic unlock after lock period expired',
              locked_until: user.locked_until
            }),
            'system',
            'scheduler'
          );
          
          console.log(`✅ Auto-unlocked account: ${user.username}`);
        });
      }
    } catch (error) {
      console.error('Auto account unlock error:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes

  intervals.push({ name: 'auto-unlock', interval });
}

/**
 * Start security monitoring alerts
 * Checks every 10 minutes for suspicious activity
 */
export function startSecurityMonitoring() {
  console.log('🔍 Starting security monitoring (every 10 minutes)...');
  
  const interval = setInterval(() => {
    try {
      // Check for suspicious failed login patterns
      const recentFailedLogins = db.db.prepare(`
        SELECT ip_address, COUNT(*) as count
        FROM audit_logs
        WHERE action = ?
          AND timestamp > datetime('now', '-10 minutes')
        GROUP BY ip_address
        HAVING count >= 5
      `).all(AUDIT_EVENTS.LOGIN_FAILED);

      if (recentFailedLogins.length > 0) {
        console.log(`⚠️ SECURITY ALERT: ${recentFailedLogins.length} IP(s) with multiple failed login attempts:`);
        recentFailedLogins.forEach(alert => {
          console.log(`   - IP: ${alert.ip_address} - ${alert.count} attempts`);
          
          // Log suspicious activity
          db.preparedStatements.insertAuditLog.run(
            null,
            AUDIT_EVENTS.SUSPICIOUS_ACTIVITY,
            JSON.stringify({ 
              type: 'multiple_failed_logins',
              ip_address: alert.ip_address,
              attempt_count: alert.count,
              time_window: '10 minutes'
            }),
            alert.ip_address,
            'security-monitor'
          );
        });
      }

      // Check for multiple simultaneous sessions (potential account sharing)
      const multipleSessionUsers = db.db.prepare(`
        SELECT user_id, COUNT(*) as session_count
        FROM user_sessions
        WHERE is_active = 1
          AND expires_at > datetime('now')
        GROUP BY user_id
        HAVING session_count > 1
      `).all();

      if (multipleSessionUsers.length > 0) {
        console.log(`⚠️ SECURITY ALERT: ${multipleSessionUsers.length} user(s) with multiple active sessions`);
        // Note: This shouldn't happen in our one-session-per-user system, 
        // but good to monitor for potential bugs
      }

    } catch (error) {
      console.error('Security monitoring error:', error);
    }
  }, 10 * 60 * 1000); // 10 minutes

  intervals.push({ name: 'security-monitor', interval });
}

/**
 * Start audit log retention cleanup
 * Runs daily to cleanup old audit logs (optional, configurable)
 * By default keeps 90 days of logs
 */
export function startAuditLogCleanup(retentionDays = 90) {
  console.log(`🗑️ Starting audit log cleanup (daily, keeping ${retentionDays} days)...`);
  
  const interval = setInterval(() => {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
      
      const result = db.db.prepare(`
        DELETE FROM audit_logs
        WHERE timestamp < ?
      `).run(cutoffDate);

      if (result.changes > 0) {
        console.log(`🗑️ Deleted ${result.changes} old audit log(s) (older than ${retentionDays} days)`);
      }
    } catch (error) {
      console.error('Audit log cleanup error:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours

  intervals.push({ name: 'audit-cleanup', interval });
}

/**
 * Start all scheduled tasks
 */
export function startAllScheduledTasks() {
  console.log('\n⏰ Starting all scheduled security tasks...');
  
  startSessionCleanup();
  startAutoAccountUnlock();
  startSecurityMonitoring();
  // startAuditLogCleanup(90); // Uncomment to enable audit log cleanup
  
  console.log(`✅ ${intervals.length} scheduled task(s) started\n`);
}

/**
 * Stop all scheduled tasks
 */
export function stopAllScheduledTasks() {
  console.log('Stopping all scheduled tasks...');
  
  intervals.forEach(({ name, interval }) => {
    clearInterval(interval);
    console.log(`Stopped: ${name}`);
  });
  
  intervals = [];
  console.log('All scheduled tasks stopped');
}

/**
 * Get status of all scheduled tasks
 */
export function getSchedulerStatus() {
  return {
    active: intervals.length > 0,
    tasks: intervals.map(({ name }) => name),
    count: intervals.length
  };
}

export default {
  startSessionCleanup,
  startAutoAccountUnlock,
  startSecurityMonitoring,
  startAuditLogCleanup,
  startAllScheduledTasks,
  stopAllScheduledTasks,
  getSchedulerStatus
};
