function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: 'Resource not found.' });
}

function errorHandler(err, req, res, _next) {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error.';
  res.status(status).json({ success: false, message });
}

module.exports = { notFoundHandler, errorHandler };
