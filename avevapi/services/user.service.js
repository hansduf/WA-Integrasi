// services/user.service.js
import db from '../lib/database.js';
import {
  AUDIT_EVENTS,
  logUserCreated,
  logUserDeleted,
  logUserUpdated
} from '../utils/audit.utils.js';
import { hashPassword, sanitizeUser } from '../utils/security.utils.js';
import { validatePassword } from '../utils/validation.utils.js';

/**
 * User Management Service
 * Handles user CRUD operations
 */

/**
 * Get all users (admin only)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {object} - { success, users, pagination }
 */
export function getAllUsers(page = 1, limit = 50) {
  try {
    // Get all users (password_hash is excluded in prepared statement)
    const allUsers = db.preparedStatements.getAllUsers.all();
    
    // Calculate pagination
    const total = allUsers.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    
    // Slice for pagination
    const users = allUsers.slice(offset, offset + limit);

    return {
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error('Get all users error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to retrieve users'
    };
  }
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {object} - { success, user }
 */
export function getUserById(userId) {
  try {
    const user = db.preparedStatements.getUserById.get(userId);
    
    if (!user) {
      return {
        success: false,
        error: 'user_not_found',
        message: 'User not found'
      };
    }

    return {
      success: true,
      user: sanitizeUser(user)
    };
  } catch (error) {
    console.error('Get user by ID error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to retrieve user'
    };
  }
}

/**
 * Create new user
 * @param {object} userData - User data
 * @param {string} userData.username - Username
 * @param {string} userData.password - Plain text password
 * @param {string} userData.full_name - Full name
 * @param {string} userData.email - Email (optional)
 * @param {string} createdBy - ID of user creating this user
 * @param {string} ipAddress - Client IP
 * @param {string} userAgent - User agent
 * @returns {Promise<object>} - { success, user }
 */
export async function createUser(userData, createdBy, ipAddress, userAgent) {
  try {
    const { username, password, full_name, email } = userData;

    // Check if username already exists
    const existingUser = db.preparedStatements.getUserByUsername.get(username);
    if (existingUser) {
      return {
        success: false,
        error: 'username_exists',
        message: 'Username already exists'
      };
    }

    // Validate password
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return {
        success: false,
        error: 'invalid_password',
        message: 'Password does not meet requirements',
        errors: passwordErrors
      };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate UUID for new user
    const userId = db.db.prepare(`
      SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || 
      substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || 
      substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))) as uuid
    `).get().uuid;

    // Insert user (role = 'admin' by default, can be 'user' or 'viewer' if needed)
    db.preparedStatements.insertUser.run(
      userId,
      username,
      passwordHash,
      full_name,
      email || null,
      'admin', // role = 'admin' by default for all users
      createdBy,
      1 // is_active = true
    );

    // Get created user
    const newUser = db.preparedStatements.getUserById.get(userId);

    // Log user creation
    await logUserCreated(
      userId,
      createdBy,
      ipAddress,
      userAgent,
      { username, full_name, email }
    );

    return {
      success: true,
      user: sanitizeUser(newUser),
      message: 'User created successfully'
    };
  } catch (error) {
    console.error('Create user error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to create user'
    };
  }
}

/**
 * Update user
 * @param {string} userId - User ID to update
 * @param {object} updates - Fields to update
 * @param {string} updates.full_name - Full name
 * @param {string} updates.email - Email
 * @param {boolean} updates.is_active - Active status
 * @param {string} updatedBy - ID of user making the update
 * @param {string} ipAddress - Client IP
 * @param {string} userAgent - User agent
 * @returns {Promise<object>} - { success, user }
 */
export async function updateUser(userId, updates, updatedBy, ipAddress, userAgent) {
  try {
    // Check if user exists
    const existingUser = db.preparedStatements.getUserById.get(userId);
    if (!existingUser) {
      return {
        success: false,
        error: 'user_not_found',
        message: 'User not found'
      };
    }

    // Prepare update data
    const full_name = updates.full_name !== undefined ? updates.full_name : existingUser.full_name;
    const email = updates.email !== undefined ? updates.email : existingUser.email;
    const is_active = updates.is_active !== undefined ? updates.is_active : existingUser.is_active;

    // Update user
    db.preparedStatements.updateUser.run(
      full_name,
      email,
      is_active ? 1 : 0,
      userId
    );

    // Get updated user
    const updatedUser = db.preparedStatements.getUserById.get(userId);

    // Log user update
    await logUserUpdated(
      userId,
      updatedBy,
      ipAddress,
      userAgent,
      updates
    );

    return {
      success: true,
      user: sanitizeUser(updatedUser),
      message: 'User updated successfully'
    };
  } catch (error) {
    console.error('Update user error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to update user'
    };
  }
}

/**
 * Delete user (soft delete - set is_active = 0)
 * @param {string} userId - User ID to delete
 * @param {string} deletedBy - ID of user performing deletion
 * @param {string} ipAddress - Client IP
 * @param {string} userAgent - User agent
 * @returns {Promise<object>} - { success, message }
 */
export async function deleteUser(userId, deletedBy, ipAddress, userAgent) {
  try {
    // Check if user exists
    const user = db.preparedStatements.getUserById.get(userId);
    if (!user) {
      return {
        success: false,
        error: 'user_not_found',
        message: 'User not found'
      };
    }
    // Log user deletion BEFORE removing the record so audit contains who deleted
    await logUserDeleted(
      userId,
      deletedBy,
      ipAddress,
      userAgent,
      { username: user.username, full_name: user.full_name }
    );

    // Nullify user_id in audit_logs to preserve audit entries but avoid FK constraint
    try {
      db.db.prepare('UPDATE audit_logs SET user_id = NULL WHERE user_id = ?').run(userId);
    } catch (e) {
      console.warn('Warning: failed to nullify audit_logs.user_id for deleted user', e);
    }

    // Remove all user sessions (permanent)
    try {
      db.preparedStatements.deleteUserSessions.run(userId);
    } catch (e) {
      console.warn('Warning: failed to delete user sessions for deleted user', e);
    }

    // Hard delete - remove the user record from users table
    try {
      db.preparedStatements.deleteUser.run(userId);
    } catch (e) {
      console.error('Hard delete failed:', e);
      return {
        success: false,
        error: 'delete_failed',
        message: 'Failed to delete user'
      };
    }

    return {
      success: true,
      message: 'User permanently deleted'
    };
  } catch (error) {
    console.error('Delete user error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to delete user'
    };
  }
}

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password (for verification)
 * @param {string} newPassword - New password
 * @param {string} changedBy - ID of user making the change
 * @param {string} ipAddress - Client IP
 * @param {string} userAgent - User agent
 * @returns {Promise<object>} - { success, message }
 */
export async function changePassword(userId, currentPassword, newPassword, changedBy, ipAddress, userAgent) {
  try {
    // Get user
    const user = db.preparedStatements.getUserById.get(userId);
    if (!user) {
      return {
        success: false,
        error: 'user_not_found',
        message: 'User not found'
      };
    }

    // Verify current password (skip for admin changing other user's password)
    if (userId === changedBy) {
      const { verifyPassword } = await import('../utils/security.utils.js');
      const isValidPassword = await verifyPassword(currentPassword, user.password_hash);
      
      if (!isValidPassword) {
        return {
          success: false,
          error: 'invalid_current_password',
          message: 'Current password is incorrect'
        };
      }
    }

    // Validate new password
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      return {
        success: false,
        error: 'invalid_password',
        message: 'New password does not meet requirements',
        errors: passwordErrors
      };
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    db.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, userId);

    // Invalidate all user sessions (force re-login)
    db.preparedStatements.invalidateUserSessions.run(userId);

    // Log password change
    await db.preparedStatements.insertAuditLog.run(
      userId,
      AUDIT_EVENTS.PASSWORD_CHANGED,
      JSON.stringify({ changed_by: changedBy }),
      ipAddress,
      userAgent
    );

    return {
      success: true,
      message: 'Password changed successfully. Please login again.'
    };
  } catch (error) {
    console.error('Change password error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to change password'
    };
  }
}

/**
 * Toggle user active status
 * @param {string} userId - User ID
 * @param {boolean} isActive - New active status
 * @param {string} changedBy - ID of user making the change
 * @param {string} ipAddress - Client IP
 * @param {string} userAgent - User agent
 * @returns {Promise<object>} - { success, message }
 */
export async function toggleUserStatus(userId, isActive, changedBy, ipAddress, userAgent) {
  try {
    // Check if user exists
    const user = db.preparedStatements.getUserById.get(userId);
    if (!user) {
      return {
        success: false,
        error: 'user_not_found',
        message: 'User not found'
      };
    }

    // Update status
    db.preparedStatements.updateUser.run(
      user.full_name,
      user.email,
      isActive ? 1 : 0,
      userId
    );

    // If disabling, invalidate all sessions
    if (!isActive) {
      db.preparedStatements.invalidateUserSessions.run(userId);
    }

    // Log status change
    const action = isActive ? AUDIT_EVENTS.USER_ENABLED : AUDIT_EVENTS.USER_DISABLED;
    await db.preparedStatements.insertAuditLog.run(
      userId,
      action,
      JSON.stringify({ changed_by: changedBy, new_status: isActive }),
      ipAddress,
      userAgent
    );

    return {
      success: true,
      message: `User ${isActive ? 'enabled' : 'disabled'} successfully`
    };
  } catch (error) {
    console.error('Toggle user status error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to change user status'
    };
  }
}

/**
 * Get user statistics
 * @returns {object} - User statistics
 */
export function getUserStatistics() {
  try {
    const allUsers = db.preparedStatements.getAllUsers.all();
    
    const stats = {
      total: allUsers.length,
      active: allUsers.filter(u => u.is_active).length,
      inactive: allUsers.filter(u => !u.is_active).length,
      locked: allUsers.filter(u => u.locked_until && new Date(u.locked_until) > new Date()).length
    };

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Get user statistics error:', error);
    return {
      success: false,
      error: 'server_error',
      message: 'Failed to retrieve statistics'
    };
  }
}

export default {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  toggleUserStatus,
  getUserStatistics
};
