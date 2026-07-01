const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crime-app';
const JWT_SECRET = process.env.JWT_SECRET || 'spotcrime_jwt_secret_key_2026';

// ===== MONGOOSE SCHEMAS =====
const userSchema = new mongoose.Schema({
  name: String, email: String, phone: String, password: String,
  role: { type: String, default: 'citizen' }, badgeId: String, station: String,
  createdAt: { type: Date, default: Date.now }
}, { collection: 'users' });

const reportSchema = new mongoose.Schema({
  citizenId: String, citizenName: String, type: String, description: String,
  location: mongoose.Schema.Types.Mixed, media: [String],
  status: { type: String, default: 'pending' }, assignedTo: String,
  createdAt: { type: Date, default: Date.now }, resolvedAt: Date
}, { collection: 'reports' });

const messageSchema = new mongoose.Schema({
  senderId: String, senderName: String, senderRole: String,
  message: String, timestamp: { type: Date, default: Date.now }
}, { _id: false });

const chatSchema = new mongoose.Schema({
  citizenId: String, citizenName: String, messages: [messageSchema],
  type: { type: String, default: 'direct' }, status: { type: String, default: 'active' },
  readBy_citizen: Date, readBy_admin: Date,
  createdAt: { type: Date, default: Date.now }
}, { collection: 'chats' });

const locationSchema = new mongoose.Schema({
  citizenId: String, citizenName: String, lat: Number, lng: Number,
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'locations' });

const User = mongoose.model('User', userSchema);
const Report = mongoose.model('Report', reportSchema);
const Chat = mongoose.model('Chat', chatSchema);
const Location = mongoose.model('Location', locationSchema);

// ===== AUTH MIDDLEWARE =====
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
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, phone, password: hashed, role: role || 'citizen', badgeId, station });
    const token = jwt.sign({ id: user._id, email, role: user.role, name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name, email, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email, role: user.role, phone: user.phone } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user.toObject());
});

app.get('/api/auth/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
  const all = await User.find({}).sort({ createdAt: -1 }).select('-password');
  res.json(all);
});

// ===== REPORT ROUTES =====
app.post('/api/reports', auth, async (req, res) => {
  try {
    const report = await Report.create({
      citizenId: req.user.id, citizenName: req.user.name,
      ...req.body
    });
    res.json(report.toObject());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/reports', auth, async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { citizenId: req.user.id };
  const all = await Report.find(filter).sort({ createdAt: -1 });
  res.json(all);
});

app.get('/api/reports/:id', auth, async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ error: 'Not found' });
  res.json(report);
});

app.patch('/api/reports/:id/status', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
  const { status } = req.body;
  const update = { status };
  if (status === 'resolved') update.resolvedAt = new Date();
  if (status === 'dispatched') update.assignedTo = req.user.id;
  await Report.findByIdAndUpdate(req.params.id, { $set: update });
  const report = await Report.findById(req.params.id);
  res.json(report);
});

app.delete('/api/reports/:id', auth, async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ error: 'Not found' });
  if (report.citizenId !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Unauthorized' });
  await Report.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ===== CHAT ROUTES =====
app.post('/api/chat/direct', auth, async (req, res) => {
  try {
    const citizenId = req.user.id;
    const citizenName = req.user.name;
    let chat = await Chat.findOne({ citizenId, type: 'direct' });
    if (!chat) {
      chat = await Chat.create({ citizenId, citizenName, messages: [], type: 'direct' });
    }
    res.json(chat);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/chat', auth, async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { citizenId: req.user.id };
  const all = await Chat.find(filter).sort({ createdAt: -1 });
  res.json(all);
});

app.get('/api/chat/:id', auth, async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return res.status(404).json({ error: 'Not found' });
  res.json(chat);
});

app.post('/api/chat/:id/message', auth, async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return res.status(404).json({ error: 'Not found' });
  const msg = { senderId: req.user.id, senderName: req.user.name, senderRole: req.user.role, message: req.body.message };
  chat.messages.push(msg);
  await chat.save();
  io.to('admins').emit('new-message', { chatId: chat._id, citizenId: chat.citizenId, citizenName: chat.citizenName, message: msg });
  io.to(chat._id.toString()).emit('new-message', { chatId: chat._id, citizenId: chat.citizenId, citizenName: chat.citizenName, message: msg });
  res.json(chat);
});

app.patch('/api/chat/:id/read', auth, async (req, res) => {
  const { role } = req.body;
  await Chat.findByIdAndUpdate(req.params.id, { $set: { [`readBy_${role}`]: new Date() } });
  res.json({ ok: true });
});

app.delete('/api/chat/:citizenId', auth, async (req, res) => {
  if (req.user.role !== 'citizen' && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Unauthorized' });
  if (req.user.role === 'citizen' && req.user.id !== req.params.citizenId)
    return res.status(403).json({ error: 'Unauthorized' });
  await Chat.deleteMany({ citizenId: req.params.citizenId });
  res.json({ ok: true });
});

// ===== LOCATION ROUTES =====
app.post('/api/location', auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await Location.create({ citizenId: req.user.id, citizenName: req.user.name, lat, lng });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/locations', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const all = await Location.find({ updatedAt: { $gte: cutoff } }).sort({ updatedAt: -1 });
  const latest = Object.values(all.reduce((acc, loc) => {
    if (!acc[loc.citizenId] || loc.updatedAt > acc[loc.citizenId].updatedAt) acc[loc.citizenId] = loc;
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
      const chat = await Chat.findById(chatId);
      if (!chat) return;
      const msg = { senderId: socket.user?.id || 'unknown', senderName: socket.user?.name || 'Unknown', senderRole: socket.user?.role || 'citizen', message };
      chat.messages.push(msg);
      await chat.save();
      io.to('admins').emit('new-message', { chatId, citizenId: chat.citizenId, citizenName: chat.citizenName, message: msg });
      io.to(chatId).emit('new-message', { chatId, citizenId: chat.citizenId, citizenName: chat.citizenName, message: msg });
    } catch {}
  });
});

// ===== START =====
mongoose.connect(MONGO_URI).then(() => {
  console.log('Connected to MongoDB');
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
