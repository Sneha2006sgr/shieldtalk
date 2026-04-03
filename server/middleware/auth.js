const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Log = require('../models/Log');

// Verify JWT token
const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied. No token.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found.' });
    if (req.user.status !== 'approved') return res.status(403).json({ message: 'Account not approved.' });
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Role-based access
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions.' });
  }
  next();
};

// Simulated secure tunnel middleware
const secureTunnel = (req, res, next) => {
  res.setHeader('X-Secure-Tunnel', 'SHIELDTALK-VPN-SIM');
  res.setHeader('X-Encryption-Layer', 'AES-256-SIMULATED');
  res.setHeader('X-Clearance-Level', req.user?.role || 'NONE');
  next();
};

// Audit logger
const auditLog = (action, severity = 'info') => async (req, res, next) => {
  try {
    await Log.create({
      userId: req.user?._id,
      action,
      details: `${req.method} ${req.originalUrl}`,
      device: req.headers['user-agent'],
      ip: req.ip,
      severity
    });
  } catch (_) {}
  next();
};

module.exports = { protect, authorize, secureTunnel, auditLog };
