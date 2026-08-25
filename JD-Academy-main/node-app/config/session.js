const { SESSION_SECRET, SESSION_LIFETIME, NODE_ENV } = require('./index');

const isProduction = NODE_ENV === 'production';

const sessionConfig = {
  name: 'jdm_session',
  secret: SESSION_SECRET,
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

module.exports = { sessionConfig };
