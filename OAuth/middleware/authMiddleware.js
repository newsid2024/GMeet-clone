const { verifyToken, extractToken } = require('../config/jwt');
const User = require('../models/user-model');

/**
 * Middleware to authenticate users via JWT
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireAuth = async (req, res, next) => {
  // Get token from request
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Verify token
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  try {
    // Find user by ID from token
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to check if user has admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin privileges required' });
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin
}; 