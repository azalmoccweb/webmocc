const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  listRequests,
  getRequestById,
  canManageRequest,
  updateRequestStatus,
  reassignRequest,
} = require('../services/requestService');
const { listUsers } = require('../services/userService');

const router = express.Router();

router.get('/requests', requireAuth, async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status || '',
      type: req.query.type || '',
      assigned: req.query.assigned || '',
    };
    const requests = await listRequests(filters, req.user);
    res.render('requests/index', {
      title: 'Requests',
      requests,
      filters,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/requests/:id', requireAuth, async (req, res, next) => {
  try {
    const request = await getRequestById(req.params.id, req.user);
    if (!request) return res.status(404).render('404', { title: 'Tapılmadı' });
    const users = await listUsers();
    res.render('requests/show', {
      title: `Request #${request.id}`,
      request,
      users: users.filter((u) => u.is_active),
      canManage: canManageRequest(request, req.user),
      isResolved: ['APPROVED', 'REJECTED'].includes(request.status),
    });
  } catch (error) {
    next(error);
  }
});

async function loadManageableRequest(req, res, next) {
  try {
    const request = await getRequestById(req.params.id, req.user?.role === 'admin' ? req.user : null);
    if (!request) return res.status(404).render('404', { title: 'Tapılmadı' });
    if (!canManageRequest(request, req.user)) {
      return res.status(403).render('500', {
        title: 'Forbidden',
        error: { message: 'Bu request üzərində əməliyyat icazəniz yoxdur.' },
      });
    }
    req.requestRecord = request;
    next();
  } catch (error) {
    next(error);
  }
}

router.post('/requests/:id/approve', requireAuth, loadManageableRequest, async (req, res, next) => {
  try {
    await updateRequestStatus({
      id: req.params.id,
      status: 'APPROVED',
      note: String(req.body.note || '').trim(),
      actorUserId: req.user.id,
    });
    res.redirect(`/requests/${req.params.id}`);
  } catch (error) {
    next(error);
  }
});

router.post('/requests/:id/reject', requireAuth, loadManageableRequest, async (req, res, next) => {
  try {
    await updateRequestStatus({
      id: req.params.id,
      status: 'REJECTED',
      note: String(req.body.note || '').trim(),
      actorUserId: req.user.id,
    });
    res.redirect(`/requests/${req.params.id}`);
  } catch (error) {
    next(error);
  }
});

router.post('/requests/:id/reassign', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await reassignRequest({
      id: req.params.id,
      assigneeUserId: req.body.assignee_user_id ? Number(req.body.assignee_user_id) : null,
      actorUserId: req.user.id,
    });
    res.redirect(`/requests/${req.params.id}`);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
