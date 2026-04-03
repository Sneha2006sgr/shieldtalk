const mongoose = require('mongoose');

const sosSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: { lat: Number, lng: Number, accuracy: Number },
  message: { type: String, default: 'EMERGENCY SOS TRIGGERED' },
  status: { type: String, enum: ['active', 'acknowledged', 'resolved'], default: 'active' },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SOSAlert', sosSchema);
