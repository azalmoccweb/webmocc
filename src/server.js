require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const { initDb } = require('./db');
const { authMiddleware } = require('./services/authService');
const { flashMiddleware } = require('./services/flashService');
const { startMailboxPolling } = require('./services/mailService');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const requestRoutes = require('./routes/requestRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const { getSenderDisplayName, getSenderInitial } = require('./services/displayService');

const app = express();
const PORT = Number(process.env.PORT || 3000);

function formatAge(seconds) {
  if (seconds == null) return '-';
  const sec = Math.max(0, Number(seconds));
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}g ${hours}s`;
  if (hours > 0) return `${hours}s ${minutes}dəq`;
  return `${minutes}dəq`;
}

function ageTone(seconds) {
  const sec = Number(seconds || 0);
  if (sec >= 86400) return 'danger';
  if (sec >= 28800) return 'warning';
  return 'success';
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: process.env.TZ || 'Asia/Baku',
  }).format(new Date(value));
}

function escapeHtmlAttribute(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildEmailPreviewDocument(html) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      :root { color-scheme: light; }
      html, body { margin: 0; padding: 0; background: #ffffff; }
      body {
        padding: 16px;
        color: #14283d;
        font: 14px/1.6 Inter, Arial, sans-serif;
        word-break: break-word;
      }
      img { max-width: 100%; height: auto; }
      table { width: auto !important; max-width: 100%; }
      pre { white-space: pre-wrap; }
      blockquote {
        margin: 0 0 0 12px;
        padding-left: 12px;
        border-left: 3px solid #d6e2ee;
        color: #4b6278;
      }
    </style>
  </head>
  <body>${String(html || '')}</body>
</html>`;
}

app.disable('x-powered-by');
app.locals.formatAge = formatAge;
app.locals.formatDate = formatDate;
app.locals.ageTone = ageTone;
app.locals.emailPreviewSrcdoc = (html) => escapeHtmlAttribute(buildEmailPreviewDocument(html));
app.locals.senderDisplayName = getSenderDisplayName;
app.locals.senderInitial = getSenderInitial;
app.locals.statusBadgeClass = (status) => ({
  PENDING: 'warning text-dark',
  APPROVED: 'success',
  REJECTED: 'danger',
  MANUAL_REVIEW: 'secondary',
}[status] || 'secondary');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.set('layout', 'layout');
app.use(expressLayouts);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.locals.appName = process.env.APP_NAME || 'Crew Request System';
  res.locals.currentPath = req.path;
  next();
});

app.use(authMiddleware);
app.use(flashMiddleware);

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

app.use(authRoutes);
app.use(dashboardRoutes);
app.use(requestRoutes);
app.use(settingsRoutes);

app.use((req, res) => {
  res.status(404).render('404', { title: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('500', { title: 'Error', error: err });
});

async function bootstrap() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required');
  }

  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    startMailboxPolling();
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
