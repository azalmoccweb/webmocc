function requireAuth(req, res, next) {
  if (!req.user) {
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.redirect('/login');
  }
  if (req.user.role !== 'admin') {
    return res.status(403).render('500', {
      title: 'Forbidden',
      error: { message: 'Bu səhifəyə giriş yalnız admin üçündür.' },
    });
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
};
