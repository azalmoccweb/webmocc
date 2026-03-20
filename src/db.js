const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const isProd = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false,
});

async function query(text, params = []) {
  return pool.query(text, params);
}

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'approver')),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS request_types (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS routing_rules (
      id SERIAL PRIMARY KEY,
      request_type_id INTEGER NOT NULL REFERENCES request_types(id) ON DELETE CASCADE,
      assignee_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (request_type_id)
    );

    CREATE TABLE IF NOT EXISTS requests (
      id SERIAL PRIMARY KEY,
      sender_name TEXT,
      sender_email TEXT,
      subject TEXT NOT NULL,
      body_text TEXT,
      body_html TEXT,
      request_type_id INTEGER REFERENCES request_types(id) ON DELETE SET NULL,
      request_type_code TEXT,
      status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'MANUAL_REVIEW')) DEFAULT 'PENDING',
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ,
      resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      resolution_note TEXT,
      source_message_id TEXT,
      source_thread_id TEXT,
      gmail_uid BIGINT,
      raw_headers JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (gmail_uid)
    );

    CREATE TABLE IF NOT EXISTS request_events (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      note TEXT,
      meta JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON requests(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_requests_received_at ON requests(received_at DESC);
    CREATE INDEX IF NOT EXISTS idx_request_events_request_id ON request_events(request_id, created_at DESC);
  `);

  await seedRequestTypes();
  await seedAdmin();
  await seedRoutingRules();
}

async function seedRequestTypes() {
  const types = [
    ['DAY_OFF', 'Day Off Request'],
    ['VACATION', 'Vacation Request'],
    ['SICK', 'Sick Request'],
  ];

  for (const [code, name] of types) {
    await query(
      `INSERT INTO request_types (code, name)
       VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
      [code, name]
    );
  }
}

async function seedAdmin() {
  const email = process.env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;
  const name = process.env.DEFAULT_ADMIN_NAME || 'Admin';

  if (!email || !password) {
    console.warn('Default admin credentials are missing. Skipping admin seed.');
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rowCount > 0) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')`,
    [name.trim(), normalizedEmail, passwordHash]
  );
}

async function seedRoutingRules() {
  await query(`
    INSERT INTO routing_rules (request_type_id)
    SELECT rt.id
    FROM request_types rt
    WHERE NOT EXISTS (
      SELECT 1 FROM routing_rules rr WHERE rr.request_type_id = rt.id
    )
  `);
}

module.exports = {
  pool,
  query,
  initDb,
};
