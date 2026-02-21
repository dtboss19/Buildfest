import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS food_rescue_posts (
    id TEXT PRIMARY KEY,
    event_name TEXT NOT NULL,
    description TEXT,
    quantity TEXT,
    photo_url TEXT,
    location TEXT,
    pickup_type TEXT NOT NULL DEFAULT 'both',
    expiry_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    is_anonymous INTEGER NOT NULL DEFAULT 1,
    special_notes TEXT,
    display_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS chat_rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'topic'
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_anonymous INTEGER NOT NULL DEFAULT 0,
    display_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id)
  );
`);

const seedRooms = db.prepare('SELECT id FROM chat_rooms LIMIT 1').get();
if (!seedRooms) {
  const rooms = [
    'General Discussion',
    'SNAP Help & Benefits',
    'Recipes with Food Shelf Items',
    'Transportation & Rides to Food Shelves',
    'Mental Health & Support',
    'Event Food Donations',
  ];
  const insertRoom = db.prepare('INSERT INTO chat_rooms (id, name, type) VALUES (?, ?, ?)');
  for (const name of rooms) {
    insertRoom.run(randomUUID(), name, 'topic');
  }
}

function randomId() {
  return randomUUID();
}

const uploadDir = path.join(__dirname, 'uploads');
import fs from 'fs';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`),
});
const upload = multer({ storage });

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

app.get('/api/food-rescue', (_req, res) => {
  try {
    const rows = db.prepare(
      `SELECT id, event_name, description, quantity, photo_url, location, pickup_type, expiry_time, status, is_anonymous, special_notes, display_name, created_at
       FROM food_rescue_posts WHERE status IN ('available','claimed') ORDER BY expiry_time ASC`
    ).all();
    res.json(rows.map((r) => ({
      ...r,
      is_anonymous: Boolean(r.is_anonymous),
      photo_url: r.photo_url || null,
    })));
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/food-rescue', upload.single('photo'), (req, res) => {
  try {
    const body = req.body || {};
    const id = randomId();
    let photoUrl = body.photo_url || null;
    if (req.file) {
      photoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }
    const displayName = (body.display_name || '').trim() || 'Anonymous';
    db.prepare(
      `INSERT INTO food_rescue_posts (id, event_name, description, quantity, photo_url, location, pickup_type, expiry_time, status, is_anonymous, special_notes, display_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?, ?)`
    ).run(
      id,
      (body.event_name || '').trim(),
      (body.description || '').trim() || null,
      (body.quantity || '').trim() || null,
      photoUrl,
      (body.location || '').trim() || null,
      body.pickup_type || 'both',
      body.expiry_time || new Date().toISOString(),
      body.is_anonymous === true || body.is_anonymous === 'true' ? 1 : 0,
      (body.special_notes || '').trim() || null,
      displayName
    );
    res.status(201).json({ id });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/chat/rooms', (_req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, type FROM chat_rooms ORDER BY name').all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/chat/rooms/:roomId/messages', (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT id, room_id, content, is_anonymous, display_name, created_at FROM chat_messages WHERE room_id = ? ORDER BY created_at ASC'
    ).all(req.params.roomId);
    res.json(rows.map((r) => ({
      ...r,
      user_id: r.display_name || 'Anonymous',
      is_anonymous: Boolean(r.is_anonymous),
    })));
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/chat/rooms/:roomId/messages', (req, res) => {
  try {
    const body = req.body || {};
    const id = randomId();
    const roomId = req.params.roomId;
    const displayName = (body.display_name || '').trim() || 'Anonymous';
    db.prepare(
      'INSERT INTO chat_messages (id, room_id, content, is_anonymous, display_name) VALUES (?, ?, ?, ?, ?)'
    ).run(
      id,
      roomId,
      (body.content || '').trim(),
      body.is_anonymous === true || body.is_anonymous === 'true' ? 1 : 0,
      displayName
    );
    res.status(201).json({ id, room_id: roomId, content: body.content, display_name: displayName, created_at: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
