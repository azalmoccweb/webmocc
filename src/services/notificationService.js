const { getSenderDisplayName } = require('./displayService');

function notificationsEnabled() {
  return String(process.env.BREVO_ENABLED || '').toLowerCase() === 'true'
    && Boolean(process.env.BREVO_API_KEY)
    && Boolean(process.env.BREVO_SENDER_EMAIL);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSmtpLoginAddress(email) {
  return /@smtp-brevo\.com$/i.test(normalizeText(email));
}

function getConfigValidationError() {
  if (String(process.env.BREVO_ENABLED || '').toLowerCase() !== 'true') {
    return 'Brevo notifications are disabled.';
  }

  if (!normalizeText(process.env.BREVO_API_KEY)) {
    return 'BREVO_API_KEY is missing.';
  }

  if (!normalizeText(process.env.BREVO_SENDER_EMAIL)) {
    return 'BREVO_SENDER_EMAIL is missing.';
  }

  if (isSmtpLoginAddress(process.env.BREVO_SENDER_EMAIL)) {
    return 'BREVO_SENDER_EMAIL must be a verified sender address, not the Brevo SMTP login.';
  }

  if (normalizeText(process.env.BREVO_REPLY_TO_EMAIL) && isSmtpLoginAddress(process.env.BREVO_REPLY_TO_EMAIL)) {
    return 'BREVO_REPLY_TO_EMAIL must be a real mailbox address, not the Brevo SMTP login.';
  }

  return null;
}

function buildDecisionCopy({ request, status, note }) {
  const isApproved = status === 'APPROVED';
  const decisionLabel = isApproved ? 'approved' : 'rejected';
  const decisionTitle = isApproved ? 'Request approved' : 'Request rejected';
  const requestType = request.request_type_name || request.request_type_code || 'request';
  const subject = `${requestType} ${isApproved ? 'approved' : 'rejected'}${request.subject ? ` - ${request.subject}` : ''}`;

  const recipientName = getSenderDisplayName(request);

  const lines = [
    `Hello${recipientName && recipientName !== 'Unknown Sender' ? ` ${recipientName}` : ''},`,
    '',
    `Your ${requestType} has been ${decisionLabel}.`,
  ];

  if (request.subject) {
    lines.push(`Original subject: ${request.subject}`);
  }

  if (note) {
    lines.push('', 'Note from approver:', note);
  }

  lines.push('', 'Thank you.');

  const noteHtml = note
    ? `
      <div style="margin-top:20px;padding:16px;border-radius:12px;background:#f4f8fc;border:1px solid #d9e5f2;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#5d7086;margin-bottom:8px;">Note from approver</div>
        <div style="font-size:14px;line-height:1.7;color:#1b2b3a;white-space:pre-wrap;">${escapeHtml(note)}</div>
      </div>`
    : '';

  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f3f7fb;font-family:Arial,Helvetica,sans-serif;color:#17324d;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dce6f0;border-radius:18px;overflow:hidden;box-shadow:0 10px 28px rgba(12,39,68,0.08);">
      <div style="padding:24px 28px;background:linear-gradient(135deg,#0d4d95,#139ef5);color:#ffffff;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:0.92;">Crew Request System</div>
        <div style="margin-top:10px;font-size:26px;font-weight:700;line-height:1.2;">${escapeHtml(decisionTitle)}</div>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Hello${recipientName && recipientName !== 'Unknown Sender' ? ` ${escapeHtml(recipientName)}` : ''},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Your <strong>${escapeHtml(requestType)}</strong> has been <strong>${escapeHtml(decisionLabel)}</strong>.</p>
        ${request.subject ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#41576d;"><strong>Original subject:</strong> ${escapeHtml(request.subject)}</p>` : ''}
        ${noteHtml}
        <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#41576d;">Thank you.</p>
      </div>
    </div>
  </body>
</html>`;

  return {
    subject,
    textContent: lines.join('\n'),
    htmlContent,
  };
}

function extractBrevoErrorText(details) {
  if (!details) return '';
  if (typeof details === 'string') return details;
  if (typeof details.message === 'string' && details.message.trim()) return details.message.trim();
  if (typeof details.error === 'string' && details.error.trim()) return details.error.trim();
  if (Array.isArray(details.errors) && details.errors.length) {
    return details.errors.map((item) => item?.message || item?.code || JSON.stringify(item)).join('; ');
  }
  if (typeof details.code === 'string' && details.code.trim()) return details.code.trim();
  return '';
}

async function sendDecisionEmail({ request, status, note }) {
  const recipientEmail = normalizeText(request?.sender_email);
  const configError = getConfigValidationError();
  if (configError) {
    return { ok: false, skipped: true, reason: configError };
  }
  if (!recipientEmail) {
    return { ok: false, skipped: true, reason: 'Request sender email is missing.' };
  }
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return { ok: false, skipped: true, reason: 'Status is not eligible for outbound notification.' };
  }

  const senderName = normalizeText(process.env.BREVO_SENDER_NAME) || 'Crew Request System';
  const senderEmail = normalizeText(process.env.BREVO_SENDER_EMAIL);
  const replyToEmail = normalizeText(process.env.BREVO_REPLY_TO_EMAIL);
  const replyToName = normalizeText(process.env.BREVO_REPLY_TO_NAME);
  const { subject, textContent, htmlContent } = buildDecisionCopy({ request, status, note });

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [
      {
        email: recipientEmail,
        ...(request.sender_name ? { name: request.sender_name } : {}),
      },
    ],
    subject,
    textContent,
    htmlContent,
  };

  if (replyToEmail) {
    payload.replyTo = {
      email: replyToEmail,
      ...(replyToName ? { name: replyToName } : {}),
    };
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { raw };
  }

  if (!response.ok) {
    const detailsText = extractBrevoErrorText(data);
    const error = new Error(`Brevo send failed with status ${response.status}${detailsText ? `: ${detailsText}` : ''}`);
    error.details = data;
    throw error;
  }

  return {
    ok: true,
    skipped: false,
    provider: 'brevo',
    messageId: data?.messageId || null,
    response: data,
  };
}

module.exports = {
  notificationsEnabled,
  sendDecisionEmail,
};
