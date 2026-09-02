const express = require('express');
const path = require('path');
const session = require('express-session');
const routes = require('./routes');
const { sessionConfig } = require('./config/session');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Required on Render (and any host behind a reverse proxy/load balancer):
// without it, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR as
// soon as it sees an X-Forwarded-For header, since it can't tell a real proxy
// from a spoofed one. Harmless when running via plain `docker run` with no
// proxy in front, which doesn't set that header.
app.set('trust proxy', 1);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session(sessionConfig));

app.use('/api', routes);
app.use('/api', require('./routes/frontendCompat'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/certificates', require('./routes/certificates'));

// Legacy-compatible PHP-style endpoints
app.use('/', require('./routes/legacy'));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
