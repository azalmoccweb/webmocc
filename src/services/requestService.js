const { query } = require('../db');
const { classifyRequest } = require('./classifier');
const { ensureAssignableUser } = require('./userService');

const RESOLVED_STATUSES = new Set(['APPROVED', 'REJECTED']);
const ACTIVE_STATUSES = new Set(['PENDING', 'MANUAL_REVIEW']);

async function getRequestTypes() {
  const result = await query('SELECT id, code, name FROM request_types ORDER BY id');
  return result.rows;
}

async function getRoutingRules() {
  const result = await query(`
    SELECT rr.id, rr.request_type_id, rt.code, rt.name,
           rr.assignee_user_id,
           u.name AS assignee_name,
           u.email AS assignee_email
    FROM routing_rules rr
    JOIN request_types rt ON rt.id = rr.request_type_id
    LEFT JOIN users u ON u.id = rr.assignee_user_id
    ORDER BY rt.id
  `);
  return result.rows;
}

async function findAssigneeForCode(code) {
  if (!code) return null;
  const result = await query(`
    SELECT rr.assignee_user_id
    FROM routing_rules rr
    JOIN request_types rt ON rt.id = rr.request_type_id
    WHERE rt.code = $1
    LIMIT 1
  `, [code]);
  return result.rows[0]?.assignee_user_id || null;
}

async function createRequestFromEmail(emailData) {
  const { subject, text, html, fromName, fromEmail, gmailUid, messageId, threadId, rawHeaders } = emailData;
  const classification = classifyRequest(subject, text);
  if (classification.status === 'IGNORED') return null;
  const assigneeId = await findAssigneeForCode(classification.code);

  const typeResult = classification.code
    ? await query('SELECT id, code FROM request_types WHERE code = $1 LIMIT 1', [classification.code])
    : { rows: [] };
  const requestType = typeResult.rows[0] || null;

  const insert = await query(`
    INSERT INTO requests (
      sender_name, sender_email, subject, body_text, body_html,
      request_type_id, request_type_code, status, assigned_to,
      source_message_id, source_thread_id, gmail_uid, raw_headers
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, $13
    )
    ON CONFLICT (gmail_uid) DO NOTHING
    RETURNING *
  `, [
    fromName || null,
    fromEmail || null,
    subject || '(No subject)',
    text || '',
    html || '',
    requestType?.id || null,
    requestType?.code || null,
    classification.status,
    assigneeId,
    messageId || null,
    threadId || null,
    gmailUid || null,
    rawHeaders || null,
  ]);

  const request = insert.rows[0];
  if (!request) return null;

  await query(
    `INSERT INTO request_events (request_id, action, note, meta)
     VALUES ($1, 'CREATED', $2, $3)`,
    [request.id, classification.reason, { classification }]
  );

  if (assigneeId) {
    await query(
      `INSERT INTO request_events (request_id, action, actor_user_id, note)
       VALUES ($1, 'ASSIGNED', $2, $3)`,
      [request.id, assigneeId, 'Auto-assigned by routing rule']
    );
  }

  return request;
}

async function listRequests(filters = {}, user = null) {
  const params = [];
  const where = [];

  if (filters.status) {
    params.push(filters.status);
    where.push(`r.status = $${params.length}`);
  }
  if (filters.type) {
    params.push(filters.type);
    where.push(`r.request_type_code = $${params.length}`);
  }
  if (filters.assigned === 'me' && user) {
    params.push(user.id);
    where.push(`r.assigned_to = $${params.length}`);
  }
  if (user && user.role !== 'admin') {
    params.push(user.id);
    where.push(`(r.assigned_to = $${params.length} OR r.status = 'MANUAL_REVIEW')`);
  }

  const sql = `
    SELECT r.*,
           rt.name AS request_type_name,
           u.name AS assignee_name,
           resolver.name AS resolved_by_name,
           EXTRACT(EPOCH FROM (NOW() - r.received_at))::BIGINT AS age_seconds
    FROM requests r
    LEFT JOIN request_types rt ON rt.id = r.request_type_id
    LEFT JOIN users u ON u.id = r.assigned_to
    LEFT JOIN users resolver ON resolver.id = r.resolved_by
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY r.received_at DESC
  `;

  const result = await query(sql, params);
  return result.rows;
}

async function getRequestById(id, user = null) {
  const params = [id];
  let authWhere = '';
  if (user && user.role !== 'admin') {
    params.push(user.id);
    authWhere = ` AND (r.assigned_to = $${params.length} OR r.status = 'MANUAL_REVIEW')`;
  }

  const result = await query(`
    SELECT r.*,
           rt.name AS request_type_name,
           u.name AS assignee_name,
           u.email AS assignee_email,
           resolver.name AS resolved_by_name,
           EXTRACT(EPOCH FROM (NOW() - r.received_at))::BIGINT AS age_seconds
    FROM requests r
    LEFT JOIN request_types rt ON rt.id = r.request_type_id
    LEFT JOIN users u ON u.id = r.assigned_to
    LEFT JOIN users resolver ON resolver.id = r.resolved_by
    WHERE r.id = $1 ${authWhere}
    LIMIT 1
  `, params);

  if (result.rowCount === 0) return null;

  const events = await query(`
    SELECT e.*, u.name AS actor_name
    FROM request_events e
    LEFT JOIN users u ON u.id = e.actor_user_id
    WHERE e.request_id = $1
    ORDER BY e.created_at DESC
  `, [id]);

  return { ...result.rows[0], events: events.rows };
}

function canManageRequest(request, user) {
  if (!request || !user) return false;
  if (!ACTIVE_STATUSES.has(request.status)) return false;
  if (user.role === 'admin') return true;
  return request.assigned_to === user.id || request.status === 'MANUAL_REVIEW';
}

async function updateRequestStatus({ id, status, note, actorUserId }) {
  const current = await query('SELECT id, status FROM requests WHERE id = $1 LIMIT 1', [id]);
  if (current.rowCount === 0) {
    throw new Error('Request tapılmadı.');
  }
  if (!ACTIVE_STATUSES.has(current.rows[0].status)) {
    throw new Error('Bu request artıq bağlanıb və yenidən qərar verilə bilməz.');
  }
  if (!RESOLVED_STATUSES.has(status)) {
    throw new Error('Keçərli status göndərilməyib.');
  }

  await query(`
    UPDATE requests
    SET status = $2,
        resolved_at = NOW(),
        resolved_by = $3,
        resolution_note = $4,
        updated_at = NOW()
    WHERE id = $1
  `, [id, status, actorUserId, note || null]);

  await query(`
    INSERT INTO request_events (request_id, action, actor_user_id, note)
    VALUES ($1, $2, $3, $4)
  `, [id, status, actorUserId, note || null]);
}

async function reassignRequest({ id, assigneeUserId, actorUserId }) {
  const current = await query('SELECT id, status FROM requests WHERE id = $1 LIMIT 1', [id]);
  if (current.rowCount === 0) {
    throw new Error('Request tapılmadı.');
  }

  await ensureAssignableUser(assigneeUserId);

  await query(
    'UPDATE requests SET assigned_to = $2, updated_at = NOW() WHERE id = $1',
    [id, assigneeUserId || null]
  );

  await query(
    `INSERT INTO request_events (request_id, action, actor_user_id, note, meta)
     VALUES ($1, 'ASSIGNED', $2, 'Request reassigned', $3)`,
    [id, actorUserId, { assigneeUserId }]
  );
}

async function getDashboardStats(user = null) {
  const params = [];
  const where = [];
  if (user && user.role !== 'admin') {
    params.push(user.id);
    where.push(`(assigned_to = $${params.length} OR status = 'MANUAL_REVIEW')`);
  }
  const filter = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await query(`
    SELECT
      COUNT(*)::INT AS total,
      COUNT(*) FILTER (WHERE status = 'PENDING')::INT AS pending,
      COUNT(*) FILTER (WHERE status = 'APPROVED')::INT AS approved,
      COUNT(*) FILTER (WHERE status = 'REJECTED')::INT AS rejected,
      COUNT(*) FILTER (WHERE status = 'MANUAL_REVIEW')::INT AS manual_review,
      COUNT(*) FILTER (WHERE status = 'PENDING' AND NOW() - received_at > INTERVAL '24 hours')::INT AS overdue
    FROM requests
    ${filter}
  `, params);

  const recentParams = [];
  const recentWhere = [`received_at >= NOW() - INTERVAL '7 days'`];
  if (user && user.role !== 'admin') {
    recentParams.push(user.id);
    recentWhere.push(`(assigned_to = $${recentParams.length} OR status = 'MANUAL_REVIEW')`);
  }

  const recent = await query(`
    SELECT DATE(received_at) AS day, COUNT(*)::INT AS total
    FROM requests
    WHERE ${recentWhere.join(' AND ')}
    GROUP BY DATE(received_at)
    ORDER BY day ASC
  `, recentParams);

  const byTypeParams = [];
  const byTypeWhere = [];
  if (user && user.role !== 'admin') {
    byTypeParams.push(user.id);
    byTypeWhere.push(`(r.assigned_to = $${byTypeParams.length} OR r.status = 'MANUAL_REVIEW')`);
  }

  const byType = await query(`
    SELECT COALESCE(rt.name, 'Manual Review') AS type_name,
           COUNT(*)::INT AS total,
           COUNT(*) FILTER (WHERE r.status = 'PENDING')::INT AS pending
    FROM requests r
    LEFT JOIN request_types rt ON rt.id = r.request_type_id
    ${byTypeWhere.length ? `WHERE ${byTypeWhere.join(' AND ')}` : ''}
    GROUP BY COALESCE(rt.name, 'Manual Review')
    ORDER BY total DESC, type_name ASC
  `, byTypeParams);

  return { summary: result.rows[0], recent: recent.rows, byType: byType.rows };
}

module.exports = {
  getRequestTypes,
  getRoutingRules,
  createRequestFromEmail,
  listRequests,
  getRequestById,
  canManageRequest,
  updateRequestStatus,
  reassignRequest,
  getDashboardStats,
};
