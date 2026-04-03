const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  groupId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  encryptedText: { type: String, default: '' },
  mediaUrl:  { type: String, default: null },
  mediaType: { type: String, enum: ['image', 'video', null], default: null },
  expiryTime: { type: Date },
  isRead: { type: Boolean, default: false },
  selfDestruct: { type: Boolean, default: false },
  destructAfterSeconds: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// TTL index for self-destruct
messageSchema.index({ expiryTime: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', messageSchema);
