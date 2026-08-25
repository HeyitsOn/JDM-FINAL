const bcrypt = require('bcrypt');
const userService = require('./userService');

async function register(req, { name, email, password }) {
  if (!name || !email || !password) {
    const err = new Error('Please enter your name, email and password.');
    err.status = 422;
    throw err;
  }

  if (typeof email !== 'string' || !email.includes('@')) {
    const err = new Error('Please enter a valid email address.');
    err.status = 422;
    throw err;
  }

  if (password.length < 8) {
    const err = new Error('Password must be at least 8 characters.');
    err.status = 422;
    throw err;
  }

  const existingUser = await userService.findByEmail(email.toLowerCase());
  if (existingUser) {
    const err = new Error('An account with that email already exists. Try logging in instead.');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = await userService.createUser(name.trim(), email.toLowerCase().trim(), passwordHash);

  await regenerateSession(req, { userId, userName: name.trim() });

  return {
    success: true,
    message: 'Account created! Welcome to JDM Academy.',
    user: { id: userId, name: name.trim(), email: email.toLowerCase().trim() }
  };
}

async function login(req, { email, password }) {
  if (!email || !password) {
    const err = new Error('Please enter your email and password.');
    err.status = 422;
    throw err;
  }

  const user = await userService.findByEmail(email.toLowerCase().trim());
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    const err = new Error('Incorrect email or password.');
    err.status = 401;
    throw err;
  }

  await regenerateSession(req, { userId: Number(user.id), userName: user.name });
  await userService.updateLastLogin(Number(user.id));

  return {
    success: true,
    message: `Welcome back, ${user.name}!`,
    user: { id: Number(user.id), name: user.name, email: user.email }
  };
}

async function logout(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) return reject(err);
      resolve({ success: true, message: 'Logged out.' });
    });
  });
}

async function session(req) {
  if (!req.session || !req.session.userId) {
    return { success: true, loggedIn: false };
  }

  const user = await userService.findById(req.session.userId);
  if (!user) {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) return reject(err);
        resolve({ success: true, loggedIn: false });
      });
    });
  }

  return {
    success: true,
    loggedIn: true,
    user: { id: Number(user.id), name: user.name, email: user.email }
  };
}

function regenerateSession(req, data) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        return reject(err);
      }
      req.session.userId = data.userId;
      req.session.userName = data.userName;
      resolve();
    });
  });
}

module.exports = { register, login, logout, session };
