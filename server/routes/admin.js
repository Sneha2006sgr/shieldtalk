const router = require('express').Router();
const crypto = require('crypto');
const User = require('../models/User');
const Log = require('../models/Log');
const SOSAlert = require('../models/SOSAlert');
const { protect, authorize } = require('../middleware/auth');

const adminOnly = [protect, authorize('hq_admin', 'admin_officer')];
const hqOnly    = [protect, authorize('hq_admin')];

// ── HQ creates a user directly (pre-approved, gets activation link) ──
router.post('/create-user', ...hqOnly, async (req, res) => {
  try {
    const { name, aadhaar, relation, role } = req.body;
    if (!name || !aadhaar) return res.status(400).json({ message: 'Name and Aadhaar required.' });

    const exists = await User.findOne({ aadhaar });
    if (exists) return res.status(400).json({ message: 'Aadhaar already registered.' });

    const token  = crypto.randomBytes(32).toString('hex');
    const user   = await User.create({
      name, aadhaar,
      relation: relation || '',
      role: role || 'defence_personnel',
      status: 'approved',
      oneTimeToken: token,
      oneTimeTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await Log.create({ userId: req.user._id, action: `HQ_CREATED_USER:${user._id}`, severity: 'info' });

    res.status(201).json({
      message: 'User created and approved.',
      userId: user._id,
      activationLink: `/activate?token=${token}`,
      token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all pending users
router.get('/pending-users', ...adminOnly, async (req, res) => {
  const users = await User.find({ status: 'pending' }).select('-password');
  res.json(users);
});

// Get all users
router.get('/users', ...adminOnly, async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

// Approve user and generate one-time login link
router.post('/approve/:id', ...adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const token = crypto.randomBytes(32).toString('hex');
    user.status = 'approved';
    user.oneTimeToken = token;
    user.oneTimeTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await user.save();

    await Log.create({ userId: req.user._id, action: `APPROVED_USER:${user._id}`, severity: 'info' });

    res.json({
      message: 'User approved.',
      activationLink: `/activate?token=${token}`,
      token
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reject user
router.post('/reject/:id', ...adminOnly, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { status: 'rejected' });
  await Log.create({ userId: req.user._id, action: `REJECTED_USER:${req.params.id}`, severity: 'warning' });
  res.json({ message: 'User rejected.' });
});

// Suspend user
router.post('/suspend/:id', ...hqOnly, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { status: 'suspended', isOnline: false });
  await Log.create({ userId: req.user._id, action: `SUSPENDED_USER:${req.params.id}`, severity: 'critical' });
  res.json({ message: 'User suspended.' });
});

// Assign role
router.post('/assign-role/:id', ...hqOnly, async (req, res) => {
  const { role } = req.body;
  const validRoles = ['defence_personnel', 'family_member', 'admin_officer', 'hq_admin'];
  if (!validRoles.includes(role)) return res.status(400).json({ message: 'Invalid role.' });
  await User.findByIdAndUpdate(req.params.id, { role });
  await Log.create({ userId: req.user._id, action: `ROLE_ASSIGNED:${role}:${req.params.id}`, severity: 'info' });
  res.json({ message: 'Role assigned.' });
});

// Get single user
router.get('/users/:id', ...adminOnly, async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json(user);
});

// Get audit logs
router.get('/logs', ...adminOnly, async (req, res) => {
  const { severity, limit = 100 } = req.query;
  const filter = severity ? { severity } : {};
  const logs = await Log.find(filter).sort({ timestamp: -1 }).limit(Number(limit)).populate('userId', 'name username');
  res.json(logs);
});

// Get active users
router.get('/active-users', ...adminOnly, async (req, res) => {
  const users = await User.find({ isOnline: true }).select('name username role deviceInfo location');
  res.json(users);
});

// Get SOS alerts
router.get('/sos-alerts', ...adminOnly, async (req, res) => {
  const alerts = await SOSAlert.find({ status: 'active' }).populate('userId', 'name username role');
  res.json(alerts);
});

// Acknowledge SOS
router.post('/sos-acknowledge/:id', ...adminOnly, async (req, res) => {
  await SOSAlert.findByIdAndUpdate(req.params.id, { status: 'acknowledged', acknowledgedBy: req.user._id });
  res.json({ message: 'SOS acknowledged.' });
});

// Dashboard stats
router.get('/stats', ...adminOnly, async (req, res) => {
  const [totalUsers, pendingUsers, activeUsers, recentLogs, activeSOS] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'pending' }),
    User.countDocuments({ isOnline: true }),
    Log.find().sort({ timestamp: -1 }).limit(10),
    SOSAlert.countDocuments({ status: 'active' })
  ]);
  res.json({ totalUsers, pendingUsers, activeUsers, recentLogs, activeSOS });
});

module.exports = router;
