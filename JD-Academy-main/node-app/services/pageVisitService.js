const pool = require('../config/database');

async function recordVisit(userId, pageKey, bookmarked) {
  if (!pageKey || pageKey.length > 80) {
    const err = new Error('Unknown page.');
    err.status = 422;
    throw err;
  }

  await pool.execute(
    'INSERT INTO page_visits (user_id, page_key, bookmarked) VALUES (?, ?, ?)',
    [userId, pageKey, bookmarked ? 1 : 0]
  );
}

module.exports = { recordVisit };
