require('dotenv').config();
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const helmet   = require('helmet');
const cors     = require('cors');
const rateLimit = require('express-rate-limit');
const path     = require('path');

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.set('io', io);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',     rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }));
app.use('/api',          rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/sos',      require('./routes/sos'));
app.use('/api/files',    require('./routes/files'));
app.use('/uploads',      express.static(path.join(__dirname, 'uploads')));
app.get('/api/health',   (_, res) => res.json({ status: 'OK' }));

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  // Express 5 requires named wildcard — use (req,res) catchall
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ─── Socket.io ────────────────────────────────────────────────────────
// userId (string) → Set of socket IDs (user may have multiple tabs)
const onlineUsers = new Map();

function addUser(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
}

function removeUser(userId, socketId) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) onlineUsers.delete(userId);
}

function getOnlineIds() {
  return [...onlineUsers.keys()];
}

function emitToUser(userId, event, data) {
  const sockets = onlineUsers.get(String(userId));
  if (!sockets) return;
  sockets.forEach(sid => io.to(sid).emit(event, data));
}

io.on('connection', (socket) => {
  console.log('[socket] connected:', socket.id);

  // ── Register ──
  socket.on('register', (userId) => {
    socket.userId = String(userId);
    addUser(socket.userId, socket.id);
    socket.join(`user_${socket.userId}`);
    // Broadcast updated online list to everyone
    io.emit('online_users', getOnlineIds());
    console.log(`[socket] ${socket.userId} registered`);
  });

  // ── Send DM ──
  // Client emits after saving to DB: { _id, senderId, receiverId, encryptedText, createdAt, ... }
  socket.on('dm', (msg) => {
    const receiverId = String(msg.receiverId?._id || msg.receiverId);
    const senderId   = String(msg.senderId?._id   || msg.senderId);
    // Push to receiver
    io.to(`user_${receiverId}`).emit('dm', msg);
    // Echo to sender's other tabs
    io.to(`user_${senderId}`).emit('dm', msg);
  });

  // ── Send group message ──
  socket.on('group_msg', (msg) => {
    const groupId = String(msg.groupId?._id || msg.groupId);
    io.to(`group_${groupId}`).emit('group_msg', msg);
  });

  // ── Join group room ──
  socket.on('join_group', (groupId) => {
    socket.join(`group_${String(groupId)}`);
  });

  // ── SOS ──
  socket.on('sos', (data) => {
    io.emit('sos_alert', data);
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    if (socket.userId) {
      removeUser(socket.userId, socket.id);
      io.emit('online_users', getOnlineIds());
      console.log(`[socket] ${socket.userId} disconnected`);
    }
  });
});

// ─── DB + Start ───────────────────────────────────────────────────────
async function autoSeed() {
  try {
    const User = require('./models/User');
    const existing = await User.findOne({ username: 'hqadmin' });
    if (existing) {
      console.log('[seed] HQ Admin already exists — skipping');
      return;
    }
    await User.create({
      name: 'HQ Administrator',
      aadhaar: '000000000000',
      username: 'hqadmin',
      password: 'ShieldTalk@2024',
      role: 'hq_admin',
      status: 'approved',
      passwordLastChanged: new Date(),
    });
    console.log('[seed] ✓ HQ Admin created  username:hqadmin  password:ShieldTalk@2024');
  } catch (e) {
    console.error('[seed] error:', e.message);
  }
}

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await autoSeed();
    server.listen(process.env.PORT || 5000, () =>
      console.log(`ShieldTalk running on :${process.env.PORT || 5000}`)
    );
  })
  .catch(err => { console.error('DB error:', err); process.exit(1); });
