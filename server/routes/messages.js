const router  = require('express').Router();
const Message = require('../models/Message');
const Group   = require('../models/Group');
const multer  = require('multer');
const path    = require('path');
const { protect } = require('../middleware/auth');

// Multer — store media in uploads/media/
const storage = multer.diskStorage({
  destination: 'uploads/media/',
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

// ── POST /api/messages/media — upload image/video then save message ──
router.post('/media', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file' });
    const { receiverId, groupId } = req.body;
    const mediaUrl  = `/uploads/media/${req.file.filename}`;
    const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';

    const doc = await Message.create({
      senderId:   req.user._id,
      receiverId: receiverId || null,
      groupId:    groupId    || null,
      encryptedText: '',
      mediaUrl,
      mediaType,
    });
    const msg = await Message.findById(doc._id).populate('senderId', 'name username _id');
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/messages — save a message ──────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { receiverId, groupId, encryptedText, selfDestruct, destructAfterSeconds } = req.body;

    const doc = await Message.create({
      senderId:   req.user._id,
      receiverId: receiverId || null,
      groupId:    groupId    || null,
      encryptedText,
      selfDestruct:         !!selfDestruct,
      destructAfterSeconds: destructAfterSeconds || 0,
      expiryTime: selfDestruct
        ? new Date(Date.now() + (destructAfterSeconds || 30) * 1000)
        : null,
    });

    // Return populated so client has sender name
    const msg = await Message.findById(doc._id)
      .populate('senderId', 'name username _id');

    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/messages/conversation/:userId ────────────────────────────
router.get('/conversation/:userId', protect, async (req, res) => {
  try {
    const msgs = await Message.find({
      groupId: null,
      $or: [
        { senderId: req.user._id,      receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.user._id },
      ],
    })
      .populate('senderId', 'name username _id')
      .sort({ createdAt: 1 });
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/messages/group/:groupId ─────────────────────────────────
router.get('/group/:groupId', protect, async (req, res) => {
  try {
    const msgs = await Message.find({ groupId: req.params.groupId })
      .populate('senderId', 'name username _id')
      .sort({ createdAt: 1 });
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/messages/contacts ────────────────────────────────────────
router.get('/contacts', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find({
      status: 'approved',
      _id: { $ne: req.user._id },
    }).select('name username role isOnline _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/messages/groups ──────────────────────────────────────────
router.get('/groups', protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name username _id')
      .populate('createdBy', 'name _id');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/messages/groups ─────────────────────────────────────────
router.post('/groups', protect, async (req, res) => {
  try {
    const { name, memberIds = [] } = req.body;
    const members = [...new Set([String(req.user._id), ...memberIds.map(String)])];
    const group = await Group.create({ name, members, createdBy: req.user._id });
    const populated = await Group.findById(group._id)
      .populate('members', 'name username _id')
      .populate('createdBy', 'name _id');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
