const pool = require('../config/database');

async function findByEmail(email) {
  const [rows] = await pool.execute('SELECT id, name, email, password_hash FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT id, name, email FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function createUser(name, email, passwordHash) {
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    [name, email, passwordHash]
  );
  return result.insertId;
}

async function updateLastLogin(userId) {
  await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [userId]);
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  updateLastLogin,
};
