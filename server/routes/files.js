const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const CryptoJS = require('crypto-js');
const File = require('../models/File');
const Log = require('../models/Log');
const { protect } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// Upload file
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    // Simulate encryption path
    const encryptedPath = CryptoJS.AES.encrypt(req.file.path, process.env.CRYPTO_SECRET).toString();

    const file = await File.create({
      uploadedBy: req.user._id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      encryptedPath,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    await Log.create({ userId: req.user._id, action: 'FILE_UPLOADED', details: req.file.originalname, severity: 'info' });
    res.status(201).json({ message: 'File uploaded and encrypted.', fileId: file._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// List files
router.get('/', protect, async (req, res) => {
  const files = await File.find({ uploadedBy: req.user._id }).select('-encryptedPath');
  res.json(files);
});

// Log file access
router.post('/access/:id', protect, async (req, res) => {
  const file = await File.findById(req.params.id);
  if (!file) return res.status(404).json({ message: 'File not found.' });
  file.accessLogs.push({ userId: req.user._id, accessedAt: new Date() });
  await file.save();
  await Log.create({ userId: req.user._id, action: 'FILE_ACCESSED', details: file.originalName, severity: 'info' });
  res.json({ message: 'Access logged.' });
});

module.exports = router;
