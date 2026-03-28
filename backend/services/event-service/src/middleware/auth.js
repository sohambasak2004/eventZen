const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const config = require('../config');

let publicKey;

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

try {
  const publicKeyPath = resolveExistingKeyPath(config.jwt.publicKeyPath);

  if (!publicKeyPath) {
    throw new Error(`Unable to resolve JWT public key path: ${config.jwt.publicKeyPath}`);
  }

  publicKey = fs.readFileSync(publicKeyPath, 'utf8');
} catch (error) {
  publicKey = process.env.JWT_SECRET || 'fallback-secret-key';
}

const decodeUser = (token) => {
  const decoded = jwt.verify(token, publicKey, {
    algorithms: [config.jwt.algorithm]
  });

  return {
    userId: decoded.sub || decoded.userId,
    email: decoded.email,
    roles: decoded.roles || []
  };
};

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token is required',
      timestamp: new Date().toISOString()
    });
  }

  try {
    req.user = decodeUser(token);
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token',
      timestamp: new Date().toISOString()
    });
  }
};

const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = decodeUser(token);
  } catch (error) {
    req.user = null;
  }

  return next();
};

const requireRole = (requiredRoles) => (req, res, next) => {
  const userRoles = Array.isArray(req.user?.roles) ? req.user.roles : [];
  const authorized = requiredRoles.some((role) =>
    userRoles.some((userRole) => String(userRole).toLowerCase() === role.toLowerCase())
  );

  if (!authorized) {
    return res.status(403).json({
      success: false,
      message: `This action requires one of these roles: ${requiredRoles.join(', ')}`,
      timestamp: new Date().toISOString()
    });
  }

  return next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole
};
