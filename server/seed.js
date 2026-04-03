// Run: node seed.js
// Creates a default HQ Admin account for testing
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ username: 'hqadmin' });
  if (existing) {
    console.log('HQ Admin already exists. Username: hqadmin');
    process.exit(0);
  }

  const admin = await User.create({
    name: 'HQ Administrator',
    aadhaar: '000000000000',
    username: 'hqadmin',
    password: 'ShieldTalk@2024',
    role: 'hq_admin',
    status: 'approved',
    passwordLastChanged: new Date()
  });

  console.log('✓ HQ Admin created');
  console.log('  Username: hqadmin');
  console.log('  Password: ShieldTalk@2024');
  console.log('  Role: hq_admin');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
