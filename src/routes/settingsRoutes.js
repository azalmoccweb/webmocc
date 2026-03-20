const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { listUsers, createUser, toggleUserActive, updateRoutingRule } = require('../services/userService');
const { getRoutingRules } = require('../services/requestService');

const router = express.Router();

router.get('/settings', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const users = await listUsers();
    const routingRules = await getRoutingRules();
    res.render('settings/index', {
      title: 'Settings',
      users,
      routingRules,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/settings/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    await createUser({ name, email, password, role });
    res.redirect('/settings');
  } catch (error) {
    next(error);
  }
});

router.post('/settings/users/:id/toggle', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await toggleUserActive(req.params.id, req.user.id);
    res.redirect('/settings');
  } catch (error) {
    next(error);
  }
});

router.post('/settings/routing', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const requestTypeIds = Array.isArray(req.body.request_type_id)
      ? req.body.request_type_id
      : [req.body.request_type_id].filter(Boolean);
    const assigneeIds = Array.isArray(req.body.assignee_user_id)
      ? req.body.assignee_user_id
      : [req.body.assignee_user_id];

    const rows = requestTypeIds.map((requestTypeId, index) => ({
      requestTypeId: Number(requestTypeId),
      assigneeUserId: assigneeIds[index] ? Number(assigneeIds[index]) : null,
    }));

    for (const row of rows) {
      await updateRoutingRule(row.requestTypeId, row.assigneeUserId);
    }

    res.redirect('/settings');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
