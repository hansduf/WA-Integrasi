// middleware/admin.middleware.js

/**
 * Admin-only middleware
 * Ensures user is authenticated and has admin privileges
 * 
 * Note: In current system, all users are admins
 * This middleware is for future role-based access control
 */
export function requireAdmin(req, res, next) {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'Authentication required'
    });
  }

  // Check if user is active
  if (!req.user.is_active) {
    return res.status(403).json({
      success: false,
      error: 'account_disabled',
      message: 'Your account has been disabled'
    });
  }

  // Check if user has admin role
  console.log('🔍 requireAdmin check:', {
    userId: req.user?.id,
    username: req.user?.username,
    role: req.user?.role,
    hasRole: !!req.user?.role,
    isAdmin: req.user?.role === 'admin'
  });
  
  if (req.user.role !== 'admin') {
    console.error('❌ Admin access denied:', {
      userId: req.user?.id,
      username: req.user?.username,
      role: req.user?.role,
      expected: 'admin'
    });
    return res.status(403).json({
      success: false,
      error: 'forbidden',
      message: 'Admin access required'
    });
  }
  
  console.log('✅ Admin access granted');
  next();
}

/**
 * Prevent self-modification middleware
 * Prevents users from modifying/deleting their own account
 */
export function preventSelfModification(req, res, next) {
  const targetUserId = req.params.id;
  const currentUserId = req.user?.id;

  if (targetUserId === currentUserId) {
    return res.status(403).json({
      success: false,
      error: 'forbidden',
      message: 'You cannot modify or delete your own account'
    });
  }

  next();
}

/**
 * Check if user can perform action
 * More granular permission checking
 */
export function checkPermission(action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Authentication required'
      });
    }

    // Future: Check specific permissions based on action
    // For now, all admins have all permissions
    
    next();
  };
}

export default {
  requireAdmin,
  preventSelfModification,
  checkPermission
};
