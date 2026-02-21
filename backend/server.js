import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { randomUUID } from 'crypto';
import twilio from 'twilio';
import cron from 'node-cron';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS sms_subscribers (
    phone TEXT PRIMARY KEY,
    created_at TEXT DEFAULT (datetime('now')),
    daily_digest INTEGER DEFAULT 1,
    surplus_drops INTEGER DEFAULT 0,
    surplus_posts INTEGER DEFAULT 0
  );
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

// Migrate existing sms_subscribers to have preference columns (no-op if already present)
['daily_digest INTEGER DEFAULT 1', 'surplus_drops INTEGER DEFAULT 0', 'surplus_posts INTEGER DEFAULT 0'].forEach((col) => {
  try {
    db.exec(`ALTER TABLE sms_subscribers ADD COLUMN ${col}`);
  } catch (e) {
    if (!/duplicate column name/i.test(e.message)) throw e;
  }
});

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
// CORS enabled so frontend (e.g. Vercel) can call API/SMS subscribe from browser
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};
app.use(cors(corsOptions));
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

// --- SMS (Twilio) ---
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return null;
}

function loadShelters() {
  const p = path.join(__dirname, 'shelters.json');
  const data = fs.readFileSync(p, 'utf8');
  return JSON.parse(data);
}

function openToday(shelters, day) {
  return shelters
    .filter((s) => s.schedule && s.schedule.some((e) => e.day === day))
    .sort((a, b) => (a.distanceMiles || 0) - (b.distanceMiles || 0));
}

function formatTime(hhmm) {
  if (!hhmm || hhmm.length < 5) return hhmm || '';
  const h = parseInt(hhmm.slice(0, 2), 10);
  const m = parseInt(hhmm.slice(3, 5), 10) || 0;
  if (h === 0) return m === 0 ? '12am' : `12:${String(m).padStart(2, '0')}am`;
  if (h === 12) return m === 0 ? '12pm' : `12:${String(m).padStart(2, '0')}pm`;
  if (h < 12) return m === 0 ? `${h}am` : `${h}:${String(m).padStart(2, '0')}am`;
  return m === 0 ? `${h - 12}pm` : `${h - 12}:${String(m).padStart(2, '0')}pm`;
}

function formatSlots(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return '';
  return slots
    .map((slot) => {
      const o = slot.open || '';
      const c = slot.close || '';
      return o && c ? `${formatTime(o)}-${formatTime(c)}` : '';
    })
    .filter(Boolean)
    .join(', ');
}

function buildDailyMessage(day) {
  try {
    const shelters = loadShelters();
    const openList = openToday(shelters, day).slice(0, 5);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[day];
    if (openList.length === 0) {
      return `Common Table: No locations open ${dayName}. Call 1-888-711-1151. Reply STOP to unsubscribe.`;
    }
    const lines = [`Food shelves open ${dayName} (near campus):`];
    for (const s of openList) {
      const entry = s.schedule?.find((e) => e.day === day);
      const hours = entry ? formatSlots(entry.slots || []) : '';
      const note = entry?.note ? ` (${entry.note})` : '';
      lines.push(`• ${s.name} (${s.distanceMiles} mi)`);
      lines.push(`  ${s.address || ''}`);
      if (hours) lines.push(`  Hours: ${hours}${note}`);
      lines.push(`  Req: ${s.eligibility || 'Call for details.'}`);
      if (s.contact) lines.push(`  Call: ${s.contact}`);
    }
    lines.push('Reply STOP to unsubscribe.');
    return lines.join('\n');
  } catch (e) {
    return 'Common Table: Alerts temporarily unavailable. Call 1-888-711-1151. Reply STOP to unsubscribe.';
  }
}

function sendSms(to, body) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return false;
  try {
    const client = twilio(TWILIO_SID, TWILIO_TOKEN);
    client.messages.create({ body, to, from: TWILIO_FROM });
    return true;
  } catch (err) {
    return false;
  }
}

function runDailySend(dayArg) {
  const day = dayArg != null ? dayArg : new Date().getDay();
  const body = buildDailyMessage(day);
  const rows = db.prepare('SELECT phone FROM sms_subscribers WHERE COALESCE(daily_digest, 1) = 1').all();
  let sent = 0;
  for (const row of rows) {
    if (sendSms(row.phone, body)) sent++;
  }
  return { subscribers: rows.length, sent };
}

app.post('/api/subscribe', (req, res) => {
  try {
    const phone = normalizePhone((req.body?.phone || '').trim());
    if (!phone) {
      return res.status(400).json({ ok: false, error: 'Invalid phone number' });
    }
    const dailyDigest = req.body?.daily_digest !== false;
    const surplusDrops = Boolean(req.body?.surplus_drops);
    const surplusPosts = Boolean(req.body?.surplus_posts);
    const insert = db.prepare(
      `INSERT INTO sms_subscribers (phone, daily_digest, surplus_drops, surplus_posts) VALUES (?, ?, ?, ?)
       ON CONFLICT(phone) DO UPDATE SET daily_digest=excluded.daily_digest, surplus_drops=excluded.surplus_drops, surplus_posts=excluded.surplus_posts`
    );
    insert.run(phone, dailyDigest ? 1 : 0, surplusDrops ? 1 : 0, surplusPosts ? 1 : 0);
    const welcome =
      "You're signed up for Common Table alerts. We'll text you based on your preferences. Reply STOP to unsubscribe.";
    if (sendSms(phone, welcome)) {
      return res.json({ ok: true, message: 'Subscribed. Check your phone for confirmation.' });
    }
    return res.json({ ok: true, message: 'Subscribed. (SMS not sent—check server Twilio config.)' });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) });
  }
});

app.post('/api/unsubscribe', (req, res) => {
  try {
    const phone = normalizePhone((req.body?.phone || '').trim());
    if (!phone) {
      return res.status(400).json({ ok: false, error: 'Invalid phone number' });
    }
    db.prepare('DELETE FROM sms_subscribers WHERE phone = ?').run(phone);
    return res.json({ ok: true, message: 'Unsubscribed.' });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) });
  }
});

app.get('/api/send-daily', (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.query.key !== cronSecret) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  const day = req.query.day != null ? parseInt(req.query.day, 10) : undefined;
  const result = runDailySend(day);
  res.json({ ok: true, subscribers: result.subscribers, sent: result.sent });
});

app.post('/api/send-daily', (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.query.key !== cronSecret) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  const day = req.query.day != null ? parseInt(req.query.day, 10) : undefined;
  const result = runDailySend(day);
  res.json({ ok: true, subscribers: result.subscribers, sent: result.sent });
});

app.get('/api/sms/health', (_req, res) => {
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM sms_subscribers').get();
    res.json({ ok: true, subscribers: row?.count ?? 0 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);

  // Daily SMS at 8:00 AM (configurable: SCHEDULE_HOUR, SCHEDULE_MINUTE, SCHEDULE_TZ)
  const scheduleHour = parseInt(process.env.SCHEDULE_HOUR ?? '8', 10);
  const scheduleMinute = parseInt(process.env.SCHEDULE_MINUTE ?? '0', 10);
  const scheduleTz = process.env.SCHEDULE_TZ ?? 'America/Chicago';
  const cronExpr = `${scheduleMinute} ${scheduleHour} * * *`;
  cron.schedule(
    cronExpr,
    () => {
      try {
        const { subscribers, sent } = runDailySend();
        console.log(`Daily SMS: ${sent}/${subscribers} sent (${scheduleTz} ${scheduleHour}:${String(scheduleMinute).padStart(2, '0')})`);
      } catch (e) {
        console.error('Daily SMS error:', e.message);
      }
    },
    { timezone: scheduleTz }
  );
  console.log(`Daily SMS scheduled at ${scheduleHour}:${String(scheduleMinute).padStart(2, '0')} ${scheduleTz}`);
});
