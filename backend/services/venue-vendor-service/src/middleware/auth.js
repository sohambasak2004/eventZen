const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const resolveExistingKeyPath = (configuredPath) => {
  const normalizedPath = configuredPath || '';

  if (!normalizedPath.trim()) {
    return null;
  }

  const candidatePaths = [
    path.resolve(process.cwd(), normalizedPath),
    path.resolve(__dirname, normalizedPath),
    path.resolve(__dirname, '..', normalizedPath),
    path.resolve(__dirname, '..', '..', normalizedPath),
    path.resolve(__dirname, '..', '..', '..', normalizedPath),
    path.resolve(__dirname, '..', '..', '..', '..', normalizedPath),
    path.resolve(__dirname, '..', '..', 'auth-service', 'public.pem')
  ];

  return candidatePaths.find((candidatePath) => fs.existsSync(candidatePath)) || null;
};

const loadVerificationKey = () => {
  const resolvedPublicKeyPath = resolveExistingKeyPath(config.jwt.publicKeyPath);

  if (resolvedPublicKeyPath) {
    console.info(`Loaded JWT public key from ${resolvedPublicKeyPath}`);
    return fs.readFileSync(resolvedPublicKeyPath, 'utf8');
  }

  console.error(
    `Failed to load JWT public key. Checked configured path "${config.jwt.publicKeyPath}" from the current working directory and service-relative fallbacks.`
  );

  // Fallback for development - this should not be used in production
  console.warn('Using fallback JWT secret for development - DO NOT USE IN PRODUCTION');
  return process.env.JWT_SECRET || 'fallback-secret-key';
};

// Load public key for JWT verification
const publicKey = loadVerificationKey();

/**
 * Middleware to verify JWT token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      message: 'Please provide a valid authentication token'
    });
  }

  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: [config.jwt.algorithm]
    });

    // Add user information to request object
    req.user = {
      userId: decoded.sub || decoded.userId,
      email: decoded.email,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
      iat: decoded.iat,
      exp: decoded.exp
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your authentication token has expired. Please login again.'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        error: 'Invalid token',
        message: 'The provided authentication token is invalid'
      });
    }

    console.error('JWT verification error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred while verifying your token'
    });
  }
};

/**
 * Middleware to check if user has required role
 */
const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate to access this resource'
      });
    }

    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [];
    const hasRequiredRole = requiredRoles.some(role =>
      userRoles.some(userRole =>
        userRole.toLowerCase() === role.toLowerCase()
      )
    );

    if (!hasRequiredRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${requiredRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has required permission
 */
const requirePermission = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate to access this resource'
      });
    }

    const userPermissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    const hasRequiredPermission = requiredPermissions.some(permission =>
      userPermissions.includes(permission)
    );

    if (!hasRequiredPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of the following permissions: ${requiredPermissions.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Middleware for optional authentication (doesn't fail if no token)
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: [config.jwt.algorithm]
    });

    req.user = {
      userId: decoded.sub || decoded.userId,
      email: decoded.email,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
      iat: decoded.iat,
      exp: decoded.exp
    };
  } catch (error) {
    // For optional auth, we just set user to null on error
    req.user = null;
  }

  next();
};

/**
 * Middleware to check if user owns the resource or has admin role
 */
const requireOwnershipOrAdmin = (resourceUserIdField = 'createdBy') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate to access this resource'
      });
    }

    // Check if user is admin
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [];
    const isAdmin = userRoles.some(role => role.toLowerCase() === 'admin');

    if (isAdmin) {
      return next();
    }

    // Check resource ownership (this will need to be handled by the route handler)
    req.checkOwnership = {
      userId: req.user.userId,
      field: resourceUserIdField
    };

    next();
  };
};

/**
 * Utility function to extract user info from token without verification
 * (useful for debugging or logging)
 */
const decodeTokenPayload = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  optionalAuth,
  requireOwnershipOrAdmin,
  decodeTokenPayload,
  resolveExistingKeyPath
};
