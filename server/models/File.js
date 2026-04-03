const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true },
  originalName: { type: String },
  encryptedPath: { type: String },
  mimeType: { type: String },
  size: { type: Number },
  accessLogs: [{ userId: mongoose.Schema.Types.ObjectId, accessedAt: Date }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema);
