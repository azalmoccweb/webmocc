const bcrypt = require('bcryptjs');
const { query } = require('../db');

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

function isValidRole(role) {
  return ['admin', 'approver'].includes(role);
}

async function listUsers() {
  const result = await query(`
    SELECT id, name, email, role, is_active, created_at
    FROM users
    ORDER BY role ASC, name ASC
  `);
  return result.rows;
}

async function getUserById(id) {
  const result = await query(
    'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1 LIMIT 1',
    [id]
  );
  return result.rows[0] || null;
}

async function createUser({ name, email, password, role }) {
  const trimmedName = String(name || '').trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = String(role || '').trim();

  if (!trimmedName || !normalizedEmail || !password) {
    throw new Error('Name, email və password mütləqdir.');
  }
  if (!isValidRole(normalizedRole)) {
    throw new Error('Role dəyəri yanlışdır.');
  }

  const existing = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [normalizedEmail]);
  if (existing.rowCount > 0) {
    throw new Error('Bu email ilə istifadəçi artıq mövcuddur.');
  }

  const hash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)`,
    [trimmedName, normalizedEmail, hash, normalizedRole]
  );
}

async function toggleUserActive(id, actorUserId) {
  const user = await getUserById(id);
  if (!user) {
    throw new Error('İstifadəçi tapılmadı.');
  }
  if (Number(id) === Number(actorUserId)) {
    throw new Error('Öz hesabınızı deaktiv edə bilməzsiniz.');
  }

  await query(
    `UPDATE users
     SET is_active = NOT is_active,
         updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

async function ensureAssignableUser(userId) {
  if (!userId) return null;
  const user = await getUserById(userId);
  if (!user || !user.is_active) {
    throw new Error('Təyin edilən istifadəçi aktiv deyil və ya tapılmadı.');
  }
  return user;
}

async function updateRoutingRule(requestTypeId, assigneeUserId) {
  await ensureAssignableUser(assigneeUserId);
  await query(
    `UPDATE routing_rules
     SET assignee_user_id = $2,
         updated_at = NOW()
     WHERE request_type_id = $1`,
    [requestTypeId, assigneeUserId || null]
  );
}

module.exports = {
  listUsers,
  createUser,
  toggleUserActive,
  updateRoutingRule,
  getUserById,
  ensureAssignableUser,
};
