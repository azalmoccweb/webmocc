const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getDashboardStats, listRequests } = require('../services/requestService');
const { gmailConfigured, syncMailboxOnce } = require('../services/mailService');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const stats = await getDashboardStats(req.user);
    const latestRequests = await listRequests({}, req.user);
    res.render('dashboard', {
      title: 'Dashboard',
      stats,
      latestRequests: latestRequests.slice(0, 8),
      gmailConfigured: gmailConfigured(),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/sync-mailbox', requireAuth, async (req, res) => {
  const result = await syncMailboxOnce();
  if (!result.ok) {
    return res.status(500).json(result);
  }
  return res.json(result);
});

module.exports = router;
