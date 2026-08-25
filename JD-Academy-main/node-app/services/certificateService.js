const crypto = require('crypto');
const pool = require('../config/database');
const { isAllowedLevel } = require('./progressService');

async function getLevelRequirements(levelKey) {
  const [rows] = await pool.execute(
    'SELECT level_label, required_topics FROM level_requirements WHERE level_key = ?',
    [levelKey]
  );
  return rows[0] || null;
}

async function getCompletedTopicCount(userId, levelKey) {
  const [rows] = await pool.execute(
    'SELECT COUNT(DISTINCT topic_key) AS done FROM progress WHERE user_id = ? AND level_key = ?',
    [userId, levelKey]
  );
  return Number(rows[0]?.done || 0);
}

async function findCertificate(userId, levelKey) {
  const [rows] = await pool.execute(
    'SELECT certificate_code, issued_at FROM certificates WHERE user_id = ? AND level_key = ?',
    [userId, levelKey]
  );
  return rows[0] || null;
}

async function createCertificate(userId, levelKey) {
  let code;
  let rows = [];
  do {
    code = 'JDM-' + randomHex(2) + '-' + randomHex(2);
    const result = await pool.execute('SELECT id FROM certificates WHERE certificate_code = ?', [code]);
    rows = result[0];
  } while (rows.length > 0);

  await pool.execute(
    'INSERT INTO certificates (user_id, level_key, certificate_code) VALUES (?, ?, ?)',
    [userId, levelKey, code]
  );

  const [issuedRows] = await pool.execute(
    'SELECT issued_at FROM certificates WHERE user_id = ? AND level_key = ?',
    [userId, levelKey]
  );
  return { code, issuedAt: issuedRows[0].issued_at };
}

async function verifyCertificate(code) {
  const [rows] = await pool.execute(
    `SELECT c.issued_at, c.level_key, u.name, lr.level_label
     FROM certificates c
     JOIN users u ON u.id = c.user_id
     JOIN level_requirements lr ON lr.level_key = c.level_key
     WHERE c.certificate_code = ?`,
    [code]
  );
  return rows[0] || null;
}

async function getCertificatesByUserId(userId) {
  const [rows] = await pool.execute(
    'SELECT level_key, certificate_code, issued_at FROM certificates WHERE user_id = ?',
    [userId]
  );
  return rows;
}

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex').toUpperCase();
}

module.exports = {
  isAllowedLevel,
  getLevelRequirements,
  getCompletedTopicCount,
  findCertificate,
  createCertificate,
  verifyCertificate,
  getCertificatesByUserId,
};
