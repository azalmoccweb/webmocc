function normalizeText(value = '') {
  return String(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function isRequestSubject(subject = '') {
  return /\brequest\b/i.test(String(subject || ''));
}

function detectType(text = '') {
  const normalized = normalizeText(text);

  if (/\b(day off|day-off|dayoff)\b/.test(normalized)) {
    return { code: 'DAY_OFF', reason: 'Matched day off keywords in subject' };
  }

  if (/\b(sick|sickness|ill|medical leave|doctor|clinic|flu|fever|hospital)\b/.test(normalized)) {
    return { code: 'SICK', reason: 'Matched sick keywords in subject' };
  }

  if (/\b(vacation|vaction|annual leave|annual vacation|holiday leave|paid leave)\b/.test(normalized)) {
    return { code: 'VACATION', reason: 'Matched vacation keywords in subject' };
  }

  return { code: null, reason: 'Request subject detected but type not recognized' };
}

function classifyRequest(subject = '', body = '') {
  if (!isRequestSubject(subject)) {
    return { code: null, status: 'IGNORED', reason: 'Subject does not include Request keyword' };
  }

  const subjectType = detectType(subject);
  if (subjectType.code) {
    return { code: subjectType.code, status: 'PENDING', reason: subjectType.reason };
  }

  return {
    code: null,
    status: 'MANUAL_REVIEW',
    reason: 'Request subject detected but exact type could not be determined from subject',
  };
}

module.exports = {
  classifyRequest,
  isRequestSubject,
};
