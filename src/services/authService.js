const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../db');

const COOKIE_NAME = 'crew_session';

function createSignedValue(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', process.env.SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

function verifySignedValue(value) {
  if (!value || !value.includes('.')) return null;
  const [encoded, signature] = value.split('.');
  const expected = crypto
    .createHmac('sha256', process.env.SESSION_SECRET)
    .update(encoded)
    .digest('base64url');

  if (signature !== expected) return null;

  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function findUserByEmail(email) {
  if (!email) return null;
  const result = await query(
    'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1 LIMIT 1',
    [String(email).toLowerCase().trim()]
  );
  return result.rows[0] || null;
}

async function findUserById(id) {
  const result = await query(
    'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1 LIMIT 1',
    [id]
  );
  return result.rows[0] || null;
}

async function login(res, email, password) {
  const user = await findUserByEmail(email);
  if (!user || !user.is_active) return null;

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;

  const token = createSignedValue({ userId: user.id, ts: Date.now() });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 12,
  });

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function logout(res) {
  res.clearCookie(COOKIE_NAME);
}

async function authMiddleware(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  const decoded = verifySignedValue(token);
  if (!decoded || !decoded.userId) {
    req.user = null;
    return next();
  }

  const user = await findUserById(decoded.userId);
  if (!user || !user.is_active) {
    req.user = null;
    return next();
  }

  req.user = user;
  next();
}

module.exports = {
  COOKIE_NAME,
  authMiddleware,
  login,
  logout,
  findUserById,
  findUserByEmail,
};
