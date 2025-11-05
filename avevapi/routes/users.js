// routes/users.js
import express from 'express';
import { preventSelfModification, requireAdmin } from '../middleware/admin.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { apiRateLimiter, sanitizeBody, strictRateLimiter, validateContentType } from '../middleware/security.middleware.js';
import {
    changePassword,
    createUser,
    deleteUser,
    getAllUsers,
    getUserById,
    getUserStatistics,
    toggleUserStatus,
    updateUser
} from '../services/user.service.js';
import { getClientIP, getUserAgent } from '../utils/security.utils.js';
import { createUserSchema, updateUserSchema, validate } from '../utils/validation.utils.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/users
 * Get all users (admin only)
 * Query: page, limit
 */
router.get('/',
  requireAdmin,
  apiRateLimiter,
  (req, res) => {
    console.log('📋 GET /api/users handler reached:', {
      page: req.query.page,
      limit: req.query.limit,
      user: req.user?.username
    });
    
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;

      console.log('📊 Fetching users from database...');
      const result = getAllUsers(page, limit);

      if (!result.success) {
        console.error('❌ getAllUsers failed:', result);
        return res.status(500).json(result);
      }

      console.log('✅ Users fetched successfully:', {
        total: result.data?.users?.length || 0,
        totalUsers: result.data?.totalUsers
      });
      
      res.json(result);
    } catch (error) {
      console.error('❌ Get all users route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to retrieve users'
      });
    }
  }
);

/**
 * GET /api/users/stats
 * Get user statistics (admin only)
 */
router.get('/stats',
  requireAdmin,
  apiRateLimiter,
  (req, res) => {
    try {
      const result = getUserStatistics();

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Get user stats route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to retrieve statistics'
      });
    }
  }
);

/**
 * GET /api/users/:id
 * Get user by ID (admin or self)
 */
router.get('/:id',
  apiRateLimiter,
  (req, res) => {
    try {
      const userId = req.params.id;
      const currentUserId = req.user.id;

      // In current system, all authenticated users can view any user
      // Check if user is admin or requesting their own data
      const isAdmin = true; // All users are admins in current system
      if (userId !== currentUserId && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'forbidden',
          message: 'You can only view your own user information'
        });
      }

      const result = getUserById(userId);

      if (!result.success) {
        const statusCode = result.error === 'user_not_found' ? 404 : 500;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Get user by ID route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to retrieve user'
      });
    }
  }
);

/**
 * POST /api/users
 * Create new user (admin only)
 * Body: { username, password, full_name, email }
 */
router.post('/',
  requireAdmin,
  strictRateLimiter,
  validateContentType,
  sanitizeBody,
  async (req, res) => {
    try {
      // Validate request body
      const { error: validationError, value } = validate(req.body, createUserSchema);
      if (validationError) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: validationError
        });
      }
      
      const userData = value;
      const createdBy = req.user.id;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);

      const result = await createUser(userData, createdBy, ipAddress, userAgent);

      if (!result.success) {
        const statusCode = result.error === 'username_exists' ? 409 : 
                          result.error === 'invalid_password' ? 400 : 500;
        return res.status(statusCode).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Create user route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to create user'
      });
    }
  }
);

/**
 * PUT /api/users/:id
 * Update user (admin or self, but self cannot change is_active)
 * Body: { full_name, email, is_active }
 */
router.put('/:id',
  apiRateLimiter,
  validateContentType,
  sanitizeBody,
  async (req, res) => {
    try {
      // Validate request body
      const { error: validationError, value } = validate(req.body, updateUserSchema);
      if (validationError) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: validationError
        });
      }
      
      const userId = req.params.id;
      const currentUserId = req.user.id;
      const updates = value;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);

      // Check if user is admin or updating their own data
      const isSelf = userId === currentUserId;
      const isAdmin = true; // All users are admins in current system

      if (!isSelf && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'forbidden',
          message: 'You can only update your own user information'
        });
      }

      // Non-admin users cannot change is_active
      if (!isAdmin && updates.is_active !== undefined) {
        return res.status(403).json({
          success: false,
          error: 'forbidden',
          message: 'You cannot change your active status'
        });
      }

      const result = await updateUser(userId, updates, currentUserId, ipAddress, userAgent);

      if (!result.success) {
        const statusCode = result.error === 'user_not_found' ? 404 : 500;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Update user route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to update user'
      });
    }
  }
);

/**
 * DELETE /api/users/:id
 * Delete user (admin only, cannot delete self)
 */
router.delete('/:id',
  requireAdmin,
  preventSelfModification,
  strictRateLimiter,
  async (req, res) => {
    try {
      const userId = req.params.id;
      const deletedBy = req.user.id;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);

      const result = await deleteUser(userId, deletedBy, ipAddress, userAgent);

      if (!result.success) {
        const statusCode = result.error === 'user_not_found' ? 404 : 500;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Delete user route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to delete user'
      });
    }
  }
);

/**
 * PUT /api/users/:id/password
 * Change user password (admin or self)
 * Body: { currentPassword, newPassword } (currentPassword only required for self)
 */
router.put('/:id/password',
  strictRateLimiter,
  validateContentType,
  sanitizeBody,
  async (req, res) => {
    try {
      const userId = req.params.id;
      const currentUserId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);

      // Validate required fields
      if (!newPassword) {
        return res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'New password is required'
        });
      }

      // Check if user is admin or changing their own password
      const isSelf = userId === currentUserId;
      const isAdmin = true; // All users are admins in current system

      if (!isSelf && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'forbidden',
          message: 'You can only change your own password'
        });
      }

      // Current password is required when changing own password
      if (isSelf && !currentPassword) {
        return res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Current password is required'
        });
      }

      const result = await changePassword(
        userId,
        currentPassword || '',
        newPassword,
        currentUserId,
        ipAddress,
        userAgent
      );

      if (!result.success) {
        const statusCode = result.error === 'user_not_found' ? 404 :
                          result.error === 'invalid_current_password' ? 401 :
                          result.error === 'invalid_password' ? 400 : 500;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Change password route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to change password'
      });
    }
  }
);

/**
 * PUT /api/users/:id/status
 * Toggle user active status (admin only, cannot modify self)
 * Body: { is_active }
 */
router.put('/:id/status',
  requireAdmin,
  preventSelfModification,
  strictRateLimiter,
  validateContentType,
  sanitizeBody,
  async (req, res) => {
    try {
      const userId = req.params.id;
      const { is_active } = req.body;
      const changedBy = req.user.id;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);

      // Validate required fields
      if (is_active === undefined) {
        return res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'is_active field is required'
        });
      }

      const result = await toggleUserStatus(userId, is_active, changedBy, ipAddress, userAgent);

      if (!result.success) {
        const statusCode = result.error === 'user_not_found' ? 404 : 500;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Toggle user status route error:', error);
      res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Failed to change user status'
      });
    }
  }
);

export default router;
