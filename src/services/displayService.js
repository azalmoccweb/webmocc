function normalizeText(value) {
  return String(value || '').trim();
}

function titleCase(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function deriveNameFromEmail(email) {
  const normalized = normalizeText(email).toLowerCase();
  const localPart = normalized.split('@')[0] || '';
  if (!localPart) return '';

  return titleCase(
    localPart
      .replace(/[._-]+/g, ' ')
      .replace(/\+/g, ' ')
      .replace(/\s+/g, ' ')
  );
}

function looksLikeEmail(value) {
  return /.+@.+\..+/.test(normalizeText(value));
}

function getSenderDisplayName(sender) {
  const rawName = normalizeText(sender?.sender_name || sender?.fromName || sender?.name);
  if (rawName && !looksLikeEmail(rawName)) return rawName;

  const fallbackEmail = sender?.sender_email || sender?.fromEmail || sender?.email || rawName;
  const derived = deriveNameFromEmail(fallbackEmail);
  if (derived) return derived;

  return 'Unknown Sender';
}

function getSenderInitial(sender) {
  const name = getSenderDisplayName(sender);
  const first = normalizeText(name).charAt(0);
  return first ? first.toUpperCase() : '?';
}

module.exports = {
  normalizeText,
  deriveNameFromEmail,
  looksLikeEmail,
  getSenderDisplayName,
  getSenderInitial,
};
