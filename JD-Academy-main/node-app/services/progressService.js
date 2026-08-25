const pool = require('../config/database');

const allowedLevels = ['primary', 'olevel', 'alevel', 'university'];

function isAllowedLevel(levelKey) {
  return allowedLevels.includes(levelKey);
}

async function getProgress(userId) {
  const [rows] = await pool.execute(
    'SELECT level_key, topic_key, score, total_questions, completed_at FROM progress WHERE user_id = ? ORDER BY completed_at DESC',
    [userId]
  );

  const [levelRows] = await pool.query('SELECT level_key, level_label, required_topics FROM level_requirements');
  const levels = {};
  for (const r of levelRows) {
    levels[r.level_key] = {
      levelKey: r.level_key,
      levelLabel: r.level_label,
      requiredTopics: Number(r.required_topics),
      topicsCompleted: 0,
      topics: [],
    };
  }

  for (const row of rows) {
    const lvl = levels[row.level_key];
    if (!lvl) continue;
    lvl.topics.push({
      topicKey: row.topic_key,
      score: Number(row.score),
      total: Number(row.total_questions),
      completedAt: row.completed_at,
    });
    lvl.topicsCompleted += 1;
  }

  return Object.values(levels).map((lvl) => ({
    ...lvl,
    levelComplete: lvl.topicsCompleted >= lvl.requiredTopics,
  }));
}

async function saveProgress(userId, { levelKey, topicKey, score, total }) {
  if (!isAllowedLevel(levelKey)) {
    const err = new Error('Unknown level.');
    err.status = 422;
    throw err;
  }

  if (!topicKey || topicKey.length > 80) {
    const err = new Error('Unknown topic.');
    err.status = 422;
    throw err;
  }

  if (score < 0 || total <= 0 || score > total) {
    const err = new Error('Invalid score.');
    err.status = 422;
    throw err;
  }

  const [rows] = await pool.execute(
    'SELECT score FROM progress WHERE user_id = ? AND topic_key = ?',
    [userId, topicKey]
  );
  const existing = rows[0] || null;

  if (existing) {
    if (score > Number(existing.score)) {
      await pool.execute(
        'UPDATE progress SET score = ?, total_questions = ?, completed_at = NOW() WHERE user_id = ? AND topic_key = ?',
        [score, total, userId, topicKey]
      );
    }
  } else {
    await pool.execute(
      'INSERT INTO progress (user_id, level_key, topic_key, score, total_questions) VALUES (?, ?, ?, ?, ?)',
      [userId, levelKey, topicKey, score, total]
    );
  }

  const [countRows] = await pool.execute(
    'SELECT COUNT(DISTINCT topic_key) AS done FROM progress WHERE user_id = ? AND level_key = ?',
    [userId, levelKey]
  );
  const done = Number(countRows[0].done || 0);

  const [reqRows] = await pool.execute(
    'SELECT required_topics FROM level_requirements WHERE level_key = ?',
    [levelKey]
  );
  const required = reqRows[0] ? Number(reqRows[0].required_topics) : null;
  const levelComplete = required !== null && done >= required;

  return { topicsCompleted: done, topicsRequired: required, levelComplete };
}

module.exports = { isAllowedLevel, saveProgress, getProgress };
