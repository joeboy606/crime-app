const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Datastore = require('@seald-io/nedb');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const users = new Datastore({ filename: path.join(dataDir, 'users.db'), autoload: true });
const reports = new Datastore({ filename: path.join(dataDir, 'reports.db'), autoload: true });
const chats = new Datastore({ filename: path.join(dataDir, 'chats.db'), autoload: true });
const locations = new Datastore({ filename: path.join(dataDir, 'locations.db'), autoload: true });

const JWT_SECRET = process.env.JWT_SECRET || 'spotcrime_jwt_secret_key_2026';

// Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

// ===== AUTH ROUTES =====
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, phone, password, role, badgeId, station } = req.body;
    const existing = await new Promise((resolve) => users.findOne({ email }).exec((e, d) => resolve(d)));
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = { name, email, phone, password: hashed, role: role || 'citizen', badgeId, station, createdAt: new Date() };
    const id = await new Promise((resolve) => users.insert(user, (e, d) => resolve(d._id)));
    const token = jwt.sign({ id, email, role: user.role, name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, name, email, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await new Promise((resolve) => users.findOne({ email }).exec((e, d) => resolve(d)));
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await new Promise((resolve) => users.findOne({ _id: req.user.id }).exec((e, d) => resolve(d)));
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...rest } = user;
  res.json({ ...rest, id: user._id });
});

// ===== REPORT ROUTES =====
app.post('/api/reports', auth, async (req, res) => {
  try {
    const { type, description, location, media } = req.body;
    const report = { citizenId: req.user.id, citizenName: req.user.name, type, description, location, media: media || [], status: 'pending', createdAt: new Date() };
    const id = await new Promise((resolve) => reports.insert(report, (e, d) => resolve(d._id)));
    res.json({ ...report, _id: id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/reports', auth, async (req, res) => {
  const all = await new Promise((resolve) => reports.find({}).sort({ createdAt: -1 }).exec((e, d) => resolve(d)));
  if (req.user.role === 'admin') return res.json(all);
  res.json(all.filter(r => r.citizenId === req.user.id));
});

app.get('/api/reports/:id', auth, async (req, res) => {
  const report = await new Promise((resolve) => reports.findOne({ _id: req.params.id }).exec((e, d) => resolve(d)));
  if (!report) return res.status(404).json({ error: 'Not found' });
  res.json(report);
});

app.patch('/api/reports/:id/status', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
  const { status } = req.body;
  const update = { $set: { status } };
  if (status === 'resolved') update.$set.resolvedAt = new Date();
  if (status === 'dispatched') update.$set.assignedTo = req.user.id;
  await new Promise((resolve) => reports.update({ _id: req.params.id }, update, {}, (e, d) => resolve(d)));
  const report = await new Promise((resolve) => reports.findOne({ _id: req.params.id }).exec((e, d) => resolve(d)));
  res.json(report);
});

// ===== DELETE REPORT =====
app.delete('/api/reports/:id', auth, async (req, res) => {
  try {
    const report = await new Promise((resolve) => reports.findOne({ _id: req.params.id }).exec((e, d) => resolve(d)));
    if (!report) return res.status(404).json({ error: 'Not found' });
    if (report.citizenId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    await new Promise((resolve) => reports.remove({ _id: req.params.id }, {}, (e, d) => resolve(d)));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== DELETE CHAT =====
app.delete('/api/chat/:citizenId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'citizen' && req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    if (req.user.role === 'citizen' && req.user.id !== req.params.citizenId) return res.status(403).json({ error: 'Unauthorized' });
    await new Promise((resolve) => chats.remove({ citizenId: req.params.citizenId }, { multi: true }, (e, d) => resolve(d)));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== CHAT ROUTES =====
// Start or get a direct chat for the current citizen
app.post('/api/chat/direct', auth, async (req, res) => {
  try {
    const citizenId = req.user.id;
    const citizenName = req.user.name;
    let chat = await new Promise((resolve) => chats.findOne({ citizenId, type: 'direct' }).exec((e, d) => resolve(d)));
    if (!chat) {
      const id = await new Promise((resolve) => chats.insert({ citizenId, citizenName, messages: [], type: 'direct', status: 'active', createdAt: new Date() }, (e, d) => resolve(d._id)));
      chat = await new Promise((resolve) => chats.findOne({ _id: id }).exec((e, d) => resolve(d)));
    }
    res.json(chat);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all chats (admin sees all, citizen sees own)
app.get('/api/chat', auth, async (req, res) => {
  const all = await new Promise((resolve) => chats.find({}).sort({ createdAt: -1 }).exec((e, d) => resolve(d)));
  if (req.user.role === 'admin') return res.json(all);
  res.json(all.filter(c => c.citizenId === req.user.id));
});

// Get a single chat with messages
app.get('/api/chat/:id', auth, async (req, res) => {
  const chat = await new Promise((resolve) => chats.findOne({ _id: req.params.id }).exec((e, d) => resolve(d)));
  if (!chat) return res.status(404).json({ error: 'Not found' });
  res.json(chat);
});

// Send a message
app.post('/api/chat/:id/message', auth, async (req, res) => {
  const chat = await new Promise((resolve) => chats.findOne({ _id: req.params.id }).exec((e, d) => resolve(d)));
  if (!chat) return res.status(404).json({ error: 'Not found' });
  const msg = { senderId: req.user.id, senderName: req.user.name, senderRole: req.user.role, message: req.body.message, timestamp: new Date() };
  chat.messages.push(msg);
  await new Promise((resolve) => chats.update({ _id: chat._id }, { $set: { messages: chat.messages } }, {}, (e, d) => resolve(d)));
  io.to('admins').emit('new-message', { chatId: chat._id, citizenId: chat.citizenId, citizenName: chat.citizenName, message: msg });
  io.to(chat._id).emit('new-message', { chatId: chat._id, citizenId: chat.citizenId, citizenName: chat.citizenName, message: msg });
  res.json(chat);
});

// Mark chat as read for a role
app.patch('/api/chat/:id/read', auth, async (req, res) => {
  const { role } = req.body;
  await new Promise((resolve) => chats.update({ _id: req.params.id }, { $set: { [`readBy_${role}`]: new Date() } }, {}, (e, d) => resolve(d)));
  res.json({ ok: true });
});

app.get('/api/auth/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
  const all = await new Promise((resolve) => users.find({}).sort({ createdAt: -1 }).exec((e, d) => resolve(d)));
  const safe = all.map(({ password, ...u }) => u);
  res.json(safe);
});

// ===== LOCATION ROUTES =====
app.post('/api/location', auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await new Promise((resolve) => locations.insert({ citizenId: req.user.id, citizenName: req.user.name, lat, lng, updatedAt: new Date() }, (e, d) => resolve(d)));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/locations', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const all = await new Promise((resolve) => locations.find({ updatedAt: { $gte: cutoff } }).sort({ updatedAt: -1 }).exec((e, d) => resolve(d)));
  const latest = Object.values(all.reduce((acc, loc) => {
    if (!acc[loc.citizenId] || new Date(loc.updatedAt) > new Date(acc[loc.citizenId].updatedAt)) acc[loc.citizenId] = loc;
    return acc;
  }, {}));
  res.json(latest);
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ===== SOCKET.IO =====
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
    } catch {}
  }
  next();
});

io.on('connection', (socket) => {
  socket.on('join-chat', (chatId) => socket.join(chatId));
  socket.on('join-admin', () => socket.join('admins'));
  socket.on('leave-admin', () => socket.leave('admins'));
  socket.on('send-message', async (data) => {
    try {
      const { chatId, message } = data;
      const chat = await new Promise((resolve) => chats.findOne({ _id: chatId }).exec((e, d) => resolve(d)));
      if (!chat) return;
      const msg = { senderId: socket.user?.id || 'unknown', senderName: socket.user?.name || 'Unknown', senderRole: socket.user?.role || 'citizen', message, timestamp: new Date() };
      chat.messages.push(msg);
      await new Promise((resolve) => chats.update({ _id: chatId }, { $set: { messages: chat.messages } }, {}, (e, d) => resolve(d)));
      io.to('admins').emit('new-message', { chatId, citizenId: chat.citizenId, citizenName: chat.citizenName, message: msg });
      io.to(chatId).emit('new-message', { chatId, citizenId: chat.citizenId, citizenName: chat.citizenName, message: msg });
    } catch {}
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
