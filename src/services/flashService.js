function flash(req, type, message) {
  resFlashStore(req, { type, message });
}

function resFlashStore(req, payload) {
  req._flash = payload;
}

function flashMiddleware(req, res, next) {
  res.locals.flash = req._flash || null;
  res.flash = (type, message) => {
    req._flash = { type, message };
    res.locals.flash = req._flash;
  };
  next();
}

module.exports = {
  flash,
  flashMiddleware,
};
