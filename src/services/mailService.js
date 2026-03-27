const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { query } = require('../db');
const { createRequestFromEmail } = require('./requestService');
const { isRequestSubject } = require('./classifier');

let pollHandle = null;
let syncInProgress = false;

function getMaxFetchPerSync() {
  const value = Number(process.env.GMAIL_MAX_FETCH_PER_SYNC || 30);
  if (!Number.isFinite(value) || value <= 0) return 30;
  return Math.min(Math.floor(value), 100);
}

function gmailConfigured() {
  return String(process.env.GMAIL_ENABLED).toLowerCase() === 'true' &&
    process.env.GMAIL_USER &&
    process.env.GMAIL_APP_PASSWORD;
}

function senderAllowed(fromEmail) {
  const allowed = (process.env.ALLOWED_SENDER_DOMAINS || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  if (!allowed.length) return true;
  const domain = String(fromEmail || '').split('@')[1]?.toLowerCase();
  return allowed.includes(domain);
}

async function alreadyImported(uid) {
  if (!uid) return false;
  const result = await query('SELECT 1 FROM requests WHERE gmail_uid = $1 LIMIT 1', [uid]);
  return result.rowCount > 0;
}

async function syncMailboxOnce() {
  if (!gmailConfigured() || syncInProgress) return { created: 0, skipped: 0, ignored: 0, ok: true };
  syncInProgress = true;

  const client = new ImapFlow({
    host: process.env.GMAIL_HOST || 'imap.gmail.com',
    port: Number(process.env.GMAIL_PORT || 993),
    secure: String(process.env.GMAIL_TLS || 'true') !== 'false',
    socketTimeout: Number(process.env.GMAIL_SOCKET_TIMEOUT_MS || 600000),
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  client.on('error', (error) => {
    console.error('IMAP client error', error);
  });

  let created = 0;
  let skipped = 0;
  let ignored = 0;

  try {
    await client.connect();
    await client.mailboxOpen(process.env.GMAIL_MAILBOX || 'INBOX');

    const totalMessages = Number(client.mailbox?.exists || 0);
    if (!totalMessages) {
      await client.logout();
      return { created, skipped, ignored, ok: true, processed: 0 };
    }

    const maxFetch = getMaxFetchPerSync();
    const startSeq = Math.max(1, totalMessages - maxFetch + 1);
    const sequenceRange = `${startSeq}:${totalMessages}`;

    if (totalMessages > maxFetch) {
      console.log(`Mailbox has ${totalMessages} messages. Scanning latest ${maxFetch} this cycle.`);
    }

    let processed = 0;

    for await (const message of client.fetch(sequenceRange, {
      uid: true,
      flags: true,
      envelope: true,
      source: true,
      bodyStructure: true,
      internalDate: true,
    })) {
      processed += 1;

      if (!message.uid || await alreadyImported(message.uid)) {
        skipped += 1;
        continue;
      }

      if (!message.source) {
        skipped += 1;
        continue;
      }

      const parsed = await simpleParser(message.source);
      const fromEmail = parsed.from?.value?.[0]?.address || null;
      const fromName = parsed.from?.value?.[0]?.name || null;
      const subject = parsed.subject || '';

      if (!senderAllowed(fromEmail)) {
        ignored += 1;
        continue;
      }

      if (!isRequestSubject(subject)) {
        ignored += 1;
        continue;
      }

      const request = await createRequestFromEmail({
        subject,
        text: parsed.text || '',
        html: parsed.html || '',
        fromEmail,
        fromName,
        gmailUid: message.uid,
        messageId: parsed.messageId || null,
        threadId: parsed.headers?.get('thread-index') || null,
        rawHeaders: Object.fromEntries((parsed.headers && parsed.headers.keys()) ? Array.from(parsed.headers.keys()).slice(0, 20).map((k) => [k, String(parsed.headers.get(k) || '')]) : []),
      });

      if (request) {
        created += 1;
      } else {
        skipped += 1;
      }
    }

    await client.logout();
    console.log(`Mailbox sync completed. Created: ${created}, skipped: ${skipped}, ignored: ${ignored}, processed: ${processed}`);
    return { created, skipped, ignored, ok: true, processed };
  } catch (error) {
    console.error('Mailbox sync failed', error);
    return { created, skipped, ignored, ok: false, error: error.message };
  } finally {
    try { await client.logout(); } catch {}
    syncInProgress = false;
  }
}

function startMailboxPolling() {
  if (!gmailConfigured()) {
    console.log('Gmail polling disabled or not configured.');
    return;
  }
  const interval = Number(process.env.POLL_INTERVAL_MS || 60000);
  if (pollHandle) clearInterval(pollHandle);
  pollHandle = setInterval(() => {
    syncMailboxOnce().catch((err) => console.error('syncMailboxOnce error', err));
  }, interval);
  syncMailboxOnce().catch((err) => console.error('Initial mailbox sync error', err));
  console.log(`Gmail polling started every ${interval} ms`);
}

module.exports = {
  gmailConfigured,
  syncMailboxOnce,
  startMailboxPolling,
};
