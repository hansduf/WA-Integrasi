// utils/audit.utils.js
import db from '../lib/database.js';

/**
 * Audit Logging Utilities
 */

/**
 * Audit event types
 */
export const AUDIT_EVENTS = {
  // Authentication
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  SESSION_EXPIRED: 'session_expired',
  SESSION_TERMINATED: 'session_terminated',
  
  // User Management
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_DISABLED: 'user_disabled',
  USER_ENABLED: 'user_enabled',
  
  // Security Events
  PASSWORD_CHANGED: 'password_changed',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_UNLOCKED: 'account_unlocked',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  INVALID_TOKEN: 'invalid_token',
  TOKEN_EXPIRED: 'token_expired',

  // Trigger Operations
  TRIGGER_CREATED: 'trigger_created',
  TRIGGER_UPDATED: 'trigger_updated',
  TRIGGER_DELETED: 'trigger_deleted',
  TRIGGER_EXECUTED: 'trigger_executed',
  TRIGGER_ENABLED: 'trigger_enabled',
  TRIGGER_DISABLED: 'trigger_disabled',

  // Data Source Operations
  CONNECTION_ADDED: 'connection_added',
  CONNECTION_UPDATED: 'connection_updated',
  CONNECTION_DELETED: 'connection_deleted',
  CONNECTION_TESTED: 'connection_tested',
  CONNECTION_ENABLED: 'connection_enabled',
  CONNECTION_DISABLED: 'connection_disabled',

  // AI Operations
  AI_CONFIG_UPDATED: 'ai_config_updated',
  AI_CONNECTION_TESTED: 'ai_connection_tested',
  AI_TRIGGER_CREATED: 'ai_trigger_created',
  AI_TRIGGER_UPDATED: 'ai_trigger_updated',
  AI_TRIGGER_DELETED: 'ai_trigger_deleted',
  AI_CHAT_SENT: 'ai_chat_sent',
  AI_RESPONSE_RECEIVED: 'ai_response_received',

  // Message Operations
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  MESSAGE_PROCESSED: 'message_processed',
  MESSAGE_FAILED: 'message_failed',

  // System Execution
  SYSTEM_QUERY_EXECUTED: 'system_query_executed',
  SYSTEM_TRIGGER_EXECUTED: 'system_trigger_executed',
  SYSTEM_MAINTENANCE_RUN: 'system_maintenance_run',
  SYSTEM_BACKUP_CREATED: 'system_backup_created'
};

/**
 * Log audit event
 * @param {string} action - Audit action (use AUDIT_EVENTS)
 * @param {object} options - Audit options
 * @param {string} options.userId - User ID (can be null for failed logins)
 * @param {object} options.details - Additional details (will be JSON stringified)
 * @param {string} options.ipAddress - Client IP address
 * @param {string} options.userAgent - User agent string
 * @returns {Promise<void>}
 */
export async function logAudit(action, options = {}) {
  try {
    const { userId = null, details = {}, ipAddress = 'unknown', userAgent = 'unknown' } = options;

    // Prepare details as JSON string
    const detailsJson = typeof details === 'string' ? details : JSON.stringify(details);

    // Insert audit log
    db.preparedStatements.insertAuditLog.run(
      userId,
      action,
      detailsJson,
      ipAddress,
      userAgent
    );

    // Log to console for monitoring
    console.log(`[AUDIT] ${action} | User: ${userId || 'N/A'} | IP: ${ipAddress}`);
  } catch (error) {
    // Handle foreign key constraint - if user doesn't exist, log with null userId
    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' && userId) {
      try {
        const { userId: _, ...optionsWithoutUserId } = options;
        await logAudit(action, { ...optionsWithoutUserId, userId: null });
        console.log(`[AUDIT] ${action} | User: ${userId} (not found, logged as anonymous) | IP: ${ipAddress}`);
        return;
      } catch (retryError) {
        console.error('Failed to retry audit log:', retryError);
      }
    }

    console.error('Failed to log audit event:', error);
    // Don't throw error - audit logging should not break the application
  }
}

/**
 * Log successful login
 */
export async function logLoginSuccess(userId, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.LOGIN_SUCCESS, {
    userId,
    ipAddress,
    userAgent,
    details: { timestamp: new Date().toISOString() }
  });
}

/**
 * Log failed login attempt
 */
export async function logLoginFailed(username, reason, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.LOGIN_FAILED, {
    userId: null,
    ipAddress,
    userAgent,
    details: { username, reason }
  });
}

/**
 * Log logout
 */
export async function logLogout(userId, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.LOGOUT, {
    userId,
    ipAddress,
    userAgent,
    details: { timestamp: new Date().toISOString() }
  });
}

/**
 * Log account locked
 */
export async function logAccountLocked(userId, attempts, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.ACCOUNT_LOCKED, {
    userId,
    ipAddress,
    userAgent,
    details: { attempts, lockedUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString() }
  });
}

/**
 * Log user created
 */
export async function logUserCreated(userId, createdBy, ipAddress, userAgent, newUser) {
  await logAudit(AUDIT_EVENTS.USER_CREATED, {
    userId: createdBy,
    ipAddress,
    userAgent,
    details: {
      newUserId: userId,
      newUsername: newUser.username,
      newUserFullName: newUser.full_name
    }
  });
}

/**
 * Log user updated
 */
export async function logUserUpdated(userId, updatedBy, ipAddress, userAgent, changes) {
  await logAudit(AUDIT_EVENTS.USER_UPDATED, {
    userId: updatedBy,
    ipAddress,
    userAgent,
    details: {
      targetUserId: userId,
      changes
    }
  });
}

/**
 * Log user deleted
 */
export async function logUserDeleted(userId, deletedBy, ipAddress, userAgent, deletedUser) {
  await logAudit(AUDIT_EVENTS.USER_DELETED, {
    userId: deletedBy,
    ipAddress,
    userAgent,
    details: {
      deletedUserId: userId,
      deletedUsername: deletedUser.username
    }
  });
}

/**
 * Log session terminated (for one-session-per-user)
 */
export async function logSessionTerminated(userId, reason, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.SESSION_TERMINATED, {
    userId,
    ipAddress,
    userAgent,
    details: { reason }
  });
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(userId, activity, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.SUSPICIOUS_ACTIVITY, {
    userId,
    ipAddress,
    userAgent,
    details: { activity }
  });
}

/**
 * TRIGGER OPERATIONS
 */

/**
 * Log trigger created
 */
export async function logTriggerCreated(userId, triggerId, triggerData, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.TRIGGER_CREATED, {
    userId,
    ipAddress,
    userAgent,
    details: {
      triggerId,
      triggerName: triggerData.name,
      triggerType: triggerData.type,
      dataSourceId: triggerData.dataSourceId
    }
  });
}

/**
 * Log trigger updated
 */
export async function logTriggerUpdated(userId, triggerId, oldData, newData, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.TRIGGER_UPDATED, {
    userId,
    ipAddress,
    userAgent,
    details: {
      triggerId,
      triggerName: newData.name,
      changes: {
        old: oldData,
        new: newData
      }
    }
  });
}

/**
 * Log trigger deleted
 */
export async function logTriggerDeleted(userId, triggerId, triggerData, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.TRIGGER_DELETED, {
    userId,
    ipAddress,
    userAgent,
    details: {
      triggerId,
      triggerName: triggerData.name,
      triggerType: triggerData.type
    }
  });
}

/**
 * Log trigger executed
 */
export async function logTriggerExecuted(triggerId, userId, executionData, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.TRIGGER_EXECUTED, {
    userId: userId || null,
    ipAddress,
    userAgent,
    details: {
      triggerId,
      executionResult: executionData.result,
      executionTime: executionData.executionTime,
      parameters: executionData.parameters
    }
  });
}

/**
 * Log trigger enabled/disabled
 */
export async function logTriggerStatusChanged(userId, triggerId, triggerName, enabled, ipAddress, userAgent) {
  const action = enabled ? AUDIT_EVENTS.TRIGGER_ENABLED : AUDIT_EVENTS.TRIGGER_DISABLED;
  await logAudit(action, {
    userId,
    ipAddress,
    userAgent,
    details: {
      triggerId,
      triggerName,
      newStatus: enabled
    }
  });
}

/**
 * DATA SOURCE OPERATIONS
 */

/**
 * Log connection added
 */
export async function logConnectionAdded(userId, connectionId, connectionData, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.CONNECTION_ADDED, {
    userId,
    ipAddress,
    userAgent,
    details: {
      connectionId,
      connectionName: connectionData.name,
      databaseType: connectionData.databaseType,
      host: connectionData.host
    }
  });
}

/**
 * Log connection updated
 */
export async function logConnectionUpdated(userId, connectionId, oldData, newData, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.CONNECTION_UPDATED, {
    userId,
    ipAddress,
    userAgent,
    details: {
      connectionId,
      connectionName: newData.name,
      changes: {
        old: oldData,
        new: newData
      }
    }
  });
}

/**
 * Log connection deleted
 */
export async function logConnectionDeleted(userId, connectionId, connectionData, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.CONNECTION_DELETED, {
    userId,
    ipAddress,
    userAgent,
    details: {
      connectionId,
      connectionName: connectionData.name,
      databaseType: connectionData.databaseType
    }
  });
}

/**
 * Log connection tested
 */
export async function logConnectionTested(userId, connectionId, connectionName, success, error, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.CONNECTION_TESTED, {
    userId,
    ipAddress,
    userAgent,
    details: {
      connectionId,
      connectionName,
      success,
      error: error || null
    }
  });
}

/**
 * Log connection enabled/disabled
 */
export async function logConnectionStatusChanged(userId, connectionId, connectionName, enabled, ipAddress, userAgent) {
  const action = enabled ? AUDIT_EVENTS.CONNECTION_ENABLED : AUDIT_EVENTS.CONNECTION_DISABLED;
  await logAudit(action, {
    userId,
    ipAddress,
    userAgent,
    details: {
      connectionId,
      connectionName,
      newStatus: enabled
    }
  });
}

/**
 * AI OPERATIONS
 */

/**
 * Log AI config updated
 */
export async function logAIConfigUpdated(userId, configData, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.AI_CONFIG_UPDATED, {
    userId,
    ipAddress,
    userAgent,
    details: {
      provider: configData.provider,
      endpoint: configData.endpoint,
      model: configData.model
    }
  });
}

/**
 * Log AI connection tested
 */
export async function logAIConnectionTested(userId, provider, success, error, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.AI_CONNECTION_TESTED, {
    userId,
    ipAddress,
    userAgent,
    details: {
      provider,
      success,
      error: error || null
    }
  });
}

/**
 * Log AI trigger created
 */
export async function logAITriggerCreated(userId, triggerId, triggerData, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.AI_TRIGGER_CREATED, {
    userId,
    ipAddress,
    userAgent,
    details: {
      triggerId,
      triggerName: triggerData.name,
      prefix: triggerData.prefix,
      aiProvider: triggerData.aiProvider
    }
  });
}

/**
 * Log AI trigger updated
 */
export async function logAITriggerUpdated(userId, triggerId, oldData, newData, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.AI_TRIGGER_UPDATED, {
    userId,
    ipAddress,
    userAgent,
    details: {
      triggerId,
      triggerName: newData.name,
      changes: {
        old: oldData,
        new: newData
      }
    }
  });
}

/**
 * Log AI trigger deleted
 */
export async function logAITriggerDeleted(userId, triggerId, triggerData, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.AI_TRIGGER_DELETED, {
    userId,
    ipAddress,
    userAgent,
    details: {
      triggerId,
      triggerName: triggerData.name,
      prefix: triggerData.prefix
    }
  });
}

/**
 * Log AI chat sent
 */
export async function logAIChatSent(userId, triggerId, message, response, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.AI_CHAT_SENT, {
    userId,
    ipAddress,
    userAgent,
    details: {
      triggerId,
      messageLength: message.length,
      responseLength: response ? response.length : 0,
      hasResponse: !!response
    }
  });
}

/**
 * MESSAGE OPERATIONS
 */

/**
 * Log message sent
 */
export async function logMessageSent(userId, messageId, recipient, messageType, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.MESSAGE_SENT, {
    userId,
    ipAddress,
    userAgent,
    details: {
      messageId,
      recipient,
      messageType,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log message received
 */
export async function logMessageReceived(sender, messageId, messageType, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.MESSAGE_RECEIVED, {
    userId: null, // System generated
    ipAddress,
    userAgent,
    details: {
      messageId,
      sender,
      messageType,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log message processed
 */
export async function logMessageProcessed(messageId, triggerId, processingResult, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.MESSAGE_PROCESSED, {
    userId: null, // System generated
    ipAddress,
    userAgent,
    details: {
      messageId,
      triggerId,
      processingResult,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * SYSTEM EXECUTION OPERATIONS
 */

/**
 * Log system query executed
 */
export async function logSystemQueryExecuted(userId, queryType, dataSourceId, query, executionTime, success, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.SYSTEM_QUERY_EXECUTED, {
    userId,
    ipAddress,
    userAgent,
    details: {
      queryType,
      dataSourceId,
      queryLength: query.length,
      executionTime,
      success,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log system trigger executed
 */
export async function logSystemTriggerExecuted(triggerId, executionData, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.SYSTEM_TRIGGER_EXECUTED, {
    userId: null, // System generated
    ipAddress,
    userAgent,
    details: {
      triggerId,
      executionResult: executionData.result,
      executionTime: executionData.executionTime,
      parameters: executionData.parameters,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * ALIASES FOR BACKWARD COMPATIBILITY AND ROUTE USAGE
 */

/**
 * Log data source created (alias for logConnectionAdded)
 */
export async function logDataSourceCreated(userId, dataSourceId, dataSourceData, ipAddress, userAgent) {
  return logConnectionAdded(userId, dataSourceId, dataSourceData, ipAddress, userAgent);
}

/**
 * Log data source updated (alias for logConnectionUpdated)
 */
export async function logDataSourceUpdated(userId, dataSourceId, oldData, newData, ipAddress, userAgent) {
  return logConnectionUpdated(userId, dataSourceId, oldData, newData, ipAddress, userAgent);
}

/**
 * Log data source deleted (alias for logConnectionDeleted)
 */
export async function logDataSourceDeleted(userId, dataSourceId, dataSourceData, ipAddress, userAgent) {
  return logConnectionDeleted(userId, dataSourceId, dataSourceData, ipAddress, userAgent);
}

/**
 * Log data source tested (alias for logConnectionTested)
 */
export async function logDataSourceTested(userId, dataSourceId, result, ipAddress, userAgent) {
  return logConnectionTested(userId, dataSourceId, result.connectionName || 'Unknown', result.success, result.error, ipAddress, userAgent);
}

/**
 * Log data source status changed (alias for logConnectionStatusChanged)
 */
export async function logDataSourceStatusChanged(userId, dataSourceId, dataSourceName, enabled, ipAddress, userAgent) {
  return logConnectionStatusChanged(userId, dataSourceId, dataSourceName, enabled, ipAddress, userAgent);
}

/**
 * Log AI chat processed (alias for logAIChatSent)
 */
export async function logAIChatProcessed(userId, triggerId, message, result, ipAddress, userAgent) {
  return logAIChatSent(userId, triggerId, message, result, ipAddress, userAgent);
}

/**
 * Log AI message sent
 */
export async function logAIMessageSent(userId, action, details, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.AI_CHAT_SENT, {
    userId,
    ipAddress,
    userAgent,
    details: {
      action,
      ...details,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log message deleted
 */
export async function logMessageDeleted(userId, messageId, messageData, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.MESSAGE_FAILED, { // Using MESSAGE_FAILED as closest match
    userId,
    ipAddress,
    userAgent,
    details: {
      messageId,
      action: 'deleted',
      messageType: messageData.type,
      sender: messageData.sender,
      recipient: messageData.recipient,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Log system maintenance run
 */
export async function logSystemMaintenanceRun(maintenanceType, result, ipAddress, userAgent) {
  await logAudit(AUDIT_EVENTS.SYSTEM_MAINTENANCE_RUN, {
    userId: null, // System generated
    ipAddress,
    userAgent,
    details: {
      maintenanceType,
      result,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Get audit logs for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of logs to retrieve
 * @param {number} offset - Offset for pagination
 * @returns {Array} - Audit logs
 */
export function getUserAuditLogs(userId, limit = 50, offset = 0) {
  try {
    return db.preparedStatements.getAuditLogsByUser.all(userId, limit, offset);
  } catch (error) {
    console.error('Failed to retrieve user audit logs:', error);
    return [];
  }
}

/**
 * Get all audit logs
 * @param {number} limit - Number of logs to retrieve
 * @param {number} offset - Offset for pagination
 * @returns {Array} - Audit logs
 */
export function getAllAuditLogs(limit = 100, offset = 0) {
  try {
    return db.preparedStatements.getAuditLogs.all(limit, offset);
  } catch (error) {
    console.error('Failed to retrieve audit logs:', error);
    return [];
  }
}

export default {
  AUDIT_EVENTS,
  logAudit,
  logLoginSuccess,
  logLoginFailed,
  logLogout,
  logAccountLocked,
  logUserCreated,
  logUserUpdated,
  logUserDeleted,
  logSessionTerminated,
  logSuspiciousActivity,
  // Trigger operations
  logTriggerCreated,
  logTriggerUpdated,
  logTriggerDeleted,
  logTriggerExecuted,
  logTriggerStatusChanged,
  // Data source operations
  logConnectionAdded,
  logConnectionUpdated,
  logConnectionDeleted,
  logConnectionTested,
  logConnectionStatusChanged,
  // Data source aliases
  logDataSourceCreated,
  logDataSourceUpdated,
  logDataSourceDeleted,
  logDataSourceTested,
  logDataSourceStatusChanged,
  // AI operations
  logAIConfigUpdated,
  logAIConnectionTested,
  logAITriggerCreated,
  logAITriggerUpdated,
  logAITriggerDeleted,
  logAIChatSent,
  logAIChatProcessed,
  logAIMessageSent,
  // Message operations
  logMessageSent,
  logMessageReceived,
  logMessageProcessed,
  logMessageDeleted,
  // System operations
  logSystemQueryExecuted,
  logSystemTriggerExecuted,
  logSystemMaintenanceRun,
  getUserAuditLogs,
  getAllAuditLogs
};
