const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  details: { type: String },
  device: { type: String },
  location: { lat: Number, lng: Number },
  ip: { type: String },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', logSchema);
