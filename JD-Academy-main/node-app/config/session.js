const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { SESSION_SECRET, SESSION_LIFETIME, NODE_ENV } = require('./index');
const pool = require('./database');

const isProduction = NODE_ENV === 'production';

// MySQL-backed store (not the express-session default MemoryStore, which
// leaks memory and loses every session on restart/across instances).
// Reuses the same pool as the rest of the app -- no new infra dependency
// like Redis, which isn't available on the cPanel shared hosting this app
// targets (see Backend/SETUP-GUIDE.txt).
const sessionStore = new MySQLStore(
  { expiration: SESSION_LIFETIME * 1000, createDatabaseTable: true },
  pool
);

const sessionConfig = {
  name: 'jdm_session',
  secret: SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: SESSION_LIFETIME * 1000,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/'
  }
};

module.exports = { sessionConfig, sessionStore };
