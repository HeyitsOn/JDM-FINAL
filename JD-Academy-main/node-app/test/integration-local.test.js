const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mysql = require('mysql2/promise');
const app = require('../app');
const pool = require('../config/database');
const { DB_HOST, DB_NAME, DB_USER, DB_PASS } = require('../config');

const baseConfig = { host: DB_HOST, user: DB_USER, password: DB_PASS, database: DB_NAME, charset: 'utf8mb4' };
let connection;
let agent;
let userId;
const uniqueEmail = `localuser_${Date.now()}_${Math.random().toString(36).slice(2,8)}@example.com`;
const uniqueName = 'Local Test User';

async function resetDatabase() {
  connection = await mysql.createConnection(baseConfig);
  await connection.execute('DELETE FROM certificates');
  await connection.execute('DELETE FROM progress');
  await connection.execute('DELETE FROM users');
  await connection.execute('ALTER TABLE users AUTO_INCREMENT = 1');
  await connection.execute('ALTER TABLE progress AUTO_INCREMENT = 1');
  await connection.execute('ALTER TABLE certificates AUTO_INCREMENT = 1');
}

async function createUser() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: uniqueName, email: uniqueEmail, password: 'strongpass123' })
    .expect(200);

  assert.equal(res.body.success, true);
  userId = res.body.user.id;
  return res;
}

test.before(async () => {
  await resetDatabase();
  agent = request.agent(app);
});

test.after(async () => {
  if (connection) await connection.end();
  if (pool) await pool.end();
});

test('registers a new account', async () => {
  const res = await createUser();
  assert.equal(res.body.user.email, uniqueEmail);
  assert.equal(Boolean(res.body.user.id), true);
});

test('prevents duplicate registration', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: uniqueName, email: uniqueEmail, password: 'strongpass123' })
    .expect(409);

  assert.equal(res.body.success, false);
  assert.match(res.body.message, /already exists/i);
});

test('logs in with valid credentials', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: uniqueEmail, password: 'strongpass123' })
    .expect(200);

  assert.equal(res.body.success, true);
  assert.equal(res.body.user.email, uniqueEmail);
  assert.equal(res.body.user.password, undefined);
});

test('rejects invalid login', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: uniqueEmail, password: 'wrongpass' })
    .expect(401);

  assert.equal(res.body.success, false);
  assert.match(res.body.message, /incorrect email or password/i);
});

test('session check reports logged in user', async () => {
  const sessionAgent = request.agent(app);
  await sessionAgent
    .post('/api/auth/login')
    .send({ email: uniqueEmail, password: 'strongpass123' })
    .expect(200);

  const res = await sessionAgent
    .get('/api/auth/session')
    .expect(200);

  assert.equal(res.body.loggedIn, true);
  assert.equal(res.body.user.email, uniqueEmail);
});

test('logout destroys session', async () => {
  const sessionAgent = request.agent(app);
  await sessionAgent
    .post('/api/auth/login')
    .send({ email: uniqueEmail, password: 'strongpass123' })
    .expect(200);

  const res = await sessionAgent
    .post('/api/auth/logout')
    .expect(200);

  assert.equal(res.body.success, true);

  const followup = await sessionAgent
    .get('/api/auth/session')
    .expect(200);

  assert.equal(followup.body.loggedIn, false);
});

test('saves valid progress and retains highest score', async () => {
  const sessionAgent = request.agent(app);
  await sessionAgent
    .post('/api/auth/login')
    .send({ email: uniqueEmail, password: 'strongpass123' })
    .expect(200);

  const first = await sessionAgent
    .post('/api/progress/save')
    .send({ levelKey: 'primary', topicKey: 'topic-1', score: 5, total: 10 })
    .expect(200);

  assert.equal(first.body.levelComplete, false);

  const second = await sessionAgent
    .post('/api/progress/save')
    .send({ levelKey: 'primary', topicKey: 'topic-1', score: 8, total: 10 })
    .expect(200);

  assert.equal(second.body.topicsCompleted, 1);
  assert.equal(second.body.levelComplete, false);

  const [rows] = await connection.execute('SELECT score FROM progress WHERE user_id = ? AND topic_key = ?', [userId, 'topic-1']);
  assert.equal(Number(rows[0].score), 8);
});

test('rejects invalid progress input', async () => {
  const sessionAgent = request.agent(app);
  await sessionAgent.post('/api/auth/login').send({ email: uniqueEmail, password: 'strongpass123' });

  const invalidLevel = await sessionAgent.post('/api/progress/save').send({ levelKey: 'bad', topicKey: 'x', score: 1, total: 2 }).expect(422);
  assert.match(invalidLevel.body.message, /unknown level/i);

  const invalidScore = await sessionAgent.post('/api/progress/save').send({ levelKey: 'primary', topicKey: 'x', score: 11, total: 10 }).expect(422);
  assert.match(invalidScore.body.message, /invalid score/i);
});

test('creates a certificate only when the level is complete and verifies it', async () => {
  const sessionAgent = request.agent(app);
  await sessionAgent.post('/api/auth/login').send({ email: uniqueEmail, password: 'strongpass123' });

  const required = 6;
  for (let i = 1; i <= required; i += 1) {
    await sessionAgent.post('/api/progress/save').send({ levelKey: 'primary', topicKey: `topic-${i}`, score: 10, total: 10 });
  }

  const view = await sessionAgent.get('/api/certificates/primary').expect(200);
  assert.match(view.text, /Certificate of Completion|JDM Academy/i);

  const [rows] = await connection.execute('SELECT certificate_code FROM certificates WHERE user_id = ? AND level_key = ?', [userId, 'primary']);
  assert.equal(rows.length, 1);
  const code = rows[0].certificate_code;

  const verify = await request(app).get('/api/certificates/verify').query({ code }).expect(200);
  assert.match(verify.text, /Valid Certificate/i);

  const invalid = await request(app).get('/api/certificates/verify').query({ code: 'BAD-CODE-123' }).expect(200);
  assert.match(invalid.text, /No certificate found/i);
});
