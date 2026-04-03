const router = require('express').Router();
const SOSAlert = require('../models/SOSAlert');
const Log = require('../models/Log');
const { protect } = require('../middleware/auth');

// Trigger SOS
router.post('/trigger', protect, async (req, res) => {
  try {
    const { location, message } = req.body;
    const alert = await SOSAlert.create({
      userId: req.user._id,
      location,
      message: message || 'EMERGENCY SOS TRIGGERED'
    });

    await Log.create({
      userId: req.user._id,
      action: 'SOS_TRIGGERED',
      details: `Location: ${JSON.stringify(location)}`,
      severity: 'critical'
    });

    // Emit via socket (handled in index.js)
    req.app.get('io')?.emit('sos_alert', {
      alertId: alert._id,
      userId: req.user._id,
      name: req.user.name,
      location,
      timestamp: alert.timestamp
    });

    res.status(201).json({ message: 'SOS alert sent to HQ.', alertId: alert._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user's own SOS history
router.get('/my-alerts', protect, async (req, res) => {
  const alerts = await SOSAlert.find({ userId: req.user._id }).sort({ timestamp: -1 });
  res.json(alerts);
});

module.exports = router;
