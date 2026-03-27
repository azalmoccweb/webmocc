const express = require('express');
const { login, logout } = require('../services/authService');
const router = express.Router();

router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('login', { title: 'Login' });
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim();
    const password = String(req.body.password || '');

    if (!email || !password) {
      res.locals.flash = { type: 'danger', message: 'Email və şifrə mütləqdir.' };
      return res.status(400).render('login', { title: 'Login' });
    }

    const user = await login(res, email, password);
    if (!user) {
      res.locals.flash = { type: 'danger', message: 'Email və ya şifrə yanlışdır.' };
      return res.status(401).render('login', { title: 'Login' });
    }
    return res.redirect('/');
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res) => {
  logout(res);
  res.redirect('/login');
});

module.exports = router;
