const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  aadhaar: { type: String, required: true, unique: true },
  username: { type: String, unique: true, sparse: true },
  password: { type: String },
  role: {
    type: String,
    enum: ['defence_personnel', 'family_member', 'admin_officer', 'hq_admin'],
    default: 'defence_personnel'
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
  relation: { type: String },
  documents: [{ fileName: String, path: String, uploadedAt: Date }],
  deviceInfo: { userAgent: String, ip: String, lastSeen: Date },
  location: { lat: Number, lng: Number, city: String },
  passwordLastChanged: { type: Date, default: Date.now },
  oneTimeToken: { type: String },
  oneTimeTokenExpiry: { type: Date },
  isOnline: { type: Boolean, default: false },
  photoPath: { type: String },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
