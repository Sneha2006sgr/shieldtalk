const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const Log = require('../models/Log');
const { protect } = require('../middleware/auth');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '8h' });

// Multer for registration photo
const storage = multer.diskStorage({
  destination: 'uploads/photos/',
  filename: (req, file, cb) => cb(null, `reg_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Register (creates pending user, accepts optional photo)
router.post('/register', upload.single('photo'), async (req, res) => {
  try {
    const { name, aadhaar, relation, role } = req.body;
    const exists = await User.findOne({ aadhaar });
    if (exists) return res.status(400).json({ message: 'Aadhaar already registered.' });

    const userData = { name, aadhaar, relation, role: role || 'defence_personnel' };
    if (req.file) userData.photoPath = req.file.path;

    const user = await User.create(userData);
    await Log.create({ userId: user._id, action: 'REGISTRATION_SUBMITTED', severity: 'info' });
    res.status(201).json({ message: 'Registration submitted. Awaiting HQ approval.', userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password, deviceInfo, location } = req.body;
    const user = await User.findOne({ username });

    if (!user || !(await user.comparePassword(password))) {
      await Log.create({ action: 'LOGIN_FAILED', details: `Username: ${username}`, severity: 'warning', ip: req.ip });
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ message: 'Account pending approval or suspended.' });
    }

    // Check password rotation (30 days)
    const daysSinceChange = (Date.now() - user.passwordLastChanged) / (1000 * 60 * 60 * 24);
    const passwordExpired = daysSinceChange > 30;

    // Update device info
    user.deviceInfo = { ...deviceInfo, lastSeen: new Date() };
    user.location = location;
    user.isOnline = true;
    await user.save();

    const token = signToken(user._id);
    await Log.create({ userId: user._id, action: 'LOGIN_SUCCESS', device: deviceInfo?.userAgent, severity: 'info', ip: req.ip });

    res.json({
      token,
      user: { _id: user._id, id: user._id, name: user.name, role: user.role, username: user.username },
      passwordExpired
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Logout
router.post('/logout', protect, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { isOnline: false });
  await Log.create({ userId: req.user._id, action: 'LOGOUT', severity: 'info' });
  res.json({ message: 'Logged out.' });
});

// Verify one-time token (for approved users to set password)
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ oneTimeToken: token, oneTimeTokenExpiry: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token.' });
    res.json({ userId: user._id, name: user.name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Set password after approval
router.post('/set-password', async (req, res) => {
  try {
    const { token, username, password } = req.body;
    const user = await User.findOne({ oneTimeToken: token, oneTimeTokenExpiry: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token.' });

    user.username = username;
    user.password = password;
    user.oneTimeToken = undefined;
    user.oneTimeTokenExpiry = undefined;
    user.passwordLastChanged = new Date();
    await user.save();

    res.json({ message: 'Account activated. You can now login.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user
router.get('/me', protect, (req, res) => {
  res.json(req.user);
});

module.exports = router;
