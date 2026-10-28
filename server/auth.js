import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { collection } from './store.js';

const scrypt = promisify(crypto.scrypt);
export const users = collection('users');
const sessions = collection('sessions');

const COOKIE = 'pr_session';
const DAY = 86_400_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s-]{7,16}$/;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

sessions.remove((s) => s.expires < Date.now()); // tidy up old sessions on start

// ---- passwords: salted scrypt hash, never the password itself ----
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return salt.toString('hex') + ':' + hash.toString('hex');
}
async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = stored.split(':');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}
let dummyHash; // used for unknown emails so the response time doesn't reveal who has an account

// ---- sessions: random token in an HttpOnly cookie; only its hash is stored ----
const parseCookies = (header = '') =>
  Object.fromEntries(header.split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));

function startSession(res, user, remember) {
  const token = crypto.randomBytes(32).toString('base64url');
  const ttl = remember ? 30 * DAY : DAY;
  sessions.insert({ tokenHash: sha(token), userId: user.id, expires: Date.now() + ttl });
  const parts = [`${COOKIE}=${token}`, 'HttpOnly', 'SameSite=Lax', 'Path=/'];
  if (remember) parts.push(`Max-Age=${ttl / 1000}`); // otherwise it ends when the browser closes
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function sessionUser(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return null;
  const session = sessions.find((s) => s.tokenHash === sha(token));
  if (!session) return null;
  if (session.expires < Date.now()) { sessions.remove((s) => s === session); return null; }
  return users.find((u) => u.id === session.userId) || null;
}

export function requireAuth(req, res, next) {
  const user = sessionUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in.' });
  req.user = user;
  next();
}

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone });

// Lock an email for 15 minutes after 5 wrong passwords
const failures = new Map();

export function registerAuth(app, rateLimit) {
  app.post('/api/auth/register', rateLimit(10, 60_000), async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim();
    const password = String(req.body?.password || '');

    const fields = {};
    if (name.length < 2 || name.length > 60) fields.name = 'Enter your name.';
    if (!EMAIL_RE.test(email) || email.length > 120) fields.email = 'Enter a valid email address.';
    if (!PHONE_RE.test(phone)) fields.phone = 'Enter a valid phone number.';
    if (password.length < 8 || password.length > 100) fields.password = 'Password must be at least 8 characters.';
    if (Object.keys(fields).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields });

    if (users.find((u) => u.email === email)) {
      return res.status(409).json({ error: 'An account with this email already exists. Try signing in.', fields: { email: 'Already registered.' } });
    }

    const user = users.insert({
      id: crypto.randomUUID(), name, email, phone,
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString(),
    });
    startSession(res, user, Boolean(req.body?.remember));
    res.status(201).json({ user: publicUser(user) });
  });

  app.post('/api/auth/login', rateLimit(10, 60_000), async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });

    const fail = failures.get(email);
    if (fail && fail.until > Date.now()) {
      return res.status(429).json({ error: 'Too many wrong attempts. Please try again in 15 minutes.' });
    }

    // RETRIEVE the stored user and VALIDATE the password against the saved hash
    const user = users.find((u) => u.email === email);
    dummyHash ||= await hashPassword('not-a-real-password');
    const ok = await verifyPassword(password, user ? user.passwordHash : dummyHash);

    if (!user || !ok) {
      const count = (fail?.count || 0) + 1;
      failures.set(email, { count, until: count >= 5 ? Date.now() + 15 * 60_000 : 0 });
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    failures.delete(email);
    startSession(res, user, Boolean(req.body?.remember));
    res.json({ user: publicUser(user) });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = sessionUser(req);
    if (!user) return res.status(401).json({ error: 'Not signed in.' });
    res.json({ user: publicUser(user) });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    if (token) sessions.remove((s) => s.tokenHash === sha(token));
    res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
    res.json({ ok: true });
  });
}
