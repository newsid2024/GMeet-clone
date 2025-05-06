const jwt = require('jsonwebtoken');
const keys = require('./keys');

// Default values if not defined in keys.js
const TOKEN_SECRET = keys.jwt?.secret || 'your_jwt_secret_key'; // This should be set in env variables in production
const TOKEN_EXPIRY = keys.jwt?.expiresIn || '1d';

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object with _id and role
 * @returns {String} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      role: user.role || 'user',
      username: user.username 
    },
    TOKEN_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, TOKEN_SECRET);
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return null;
  }
};

/**
 * Extract token from request
 * @param {Object} req - Express request object
 * @returns {String|null} JWT token or null if not found
 */
const extractToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
};

module.exports = {
  generateToken,
  verifyToken,
  extractToken
}; 