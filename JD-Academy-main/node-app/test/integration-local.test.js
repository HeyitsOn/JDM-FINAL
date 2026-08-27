process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mysql = require('mysql2/promise');
const app = require('../app');
const pool = require('../config/database');
const { sessionStore } = require('../config/session');
const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS } = require('../config');

const baseConfig = { host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS, database: DB_NAME, charset: 'utf8mb4' };
let connection;
let agent;
let userId;
const uniqueEmail = `localuser_${Date.now()}_${Math.random().toString(36).slice(2,8)}@example.com`;
const uniqueName = 'Local Test User';

async function resetDatabase() {
  connection = await mysql.createConnection(baseConfig);
  await connection.execute('DELETE FROM certificates');
  await connection.execute('DELETE FROM progress');
  await connection.execute('DELETE FROM page_visits');
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
  // MySQLStore defaults to clearExpired: true, which runs its own
  // setInterval independent of the pool -- pool.end() alone leaves that
  // timer running and the process (and this test run) never exits.
  if (sessionStore) sessionStore.close();
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

test('rejects a name over 100 characters, matching the PHP reference', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'a'.repeat(101), email: `toolongname_${Date.now()}@example.com`, password: 'strongpass123' })
    .expect(422);

  assert.equal(res.body.success, false);
  assert.match(res.body.message, /please enter your name/i);
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

  const setCookie = res.headers['set-cookie'] || [];
  assert.ok(
    setCookie.some((c) => c.startsWith('jdm_session=;')),
    'logout should clear the jdm_session cookie client-side, not just destroy it server-side'
  );
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

test('page visits are recorded under the session user, not a client-supplied id', async () => {
  const sessionAgent = request.agent(app);
  await sessionAgent.post('/api/auth/login').send({ email: uniqueEmail, password: 'strongpass123' });

  const res = await sessionAgent
    .post('/page-visits')
    .send({ user_id: 999999, topic: 'primary-counting', bookmarked: true, timestamp: new Date().toISOString() })
    .expect(200);
  assert.equal(res.body.success, true);

  const [rows] = await connection.execute(
    'SELECT user_id, page_key, bookmarked FROM page_visits WHERE user_id = ? ORDER BY id DESC LIMIT 1',
    [userId]
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].page_key, 'primary-counting');
  assert.equal(Number(rows[0].bookmarked), 1);
});

test('the live frontend contract (/register, /login, /save-progress) matches the real progress API', async () => {
  const email = `livecontract_${Date.now()}@example.com`;

  const reg = await request(app).post('/register').send({ name: 'Live Contract', email, password: 'strongpass123' }).expect(200);
  assert.equal(reg.body.ok, true);
  assert.equal(reg.body.user.email, email);

  const agent = request.agent(app);
  const login = await agent.post('/login').send({ email, password: 'strongpass123' }).expect(200);
  assert.equal(login.body.ok, true);

  const save = await agent
    .post('/save-progress')
    .send({ levelKey: 'olevel', topicKey: 'sets-venn', score: 5, total: 6 })
    .expect(200);
  assert.equal(save.body.success, true);
  assert.equal(save.body.topicsCompleted, 1);
});

test('my-certificates page lists earned certificates and in-progress levels', async () => {
  const sessionAgent = request.agent(app);
  await sessionAgent.post('/api/auth/login').send({ email: uniqueEmail, password: 'strongpass123' }).expect(200);

  const page = await sessionAgent.get('/my-certificates').expect(200);
  assert.match(page.text, /Primary Mathematics/);
  assert.match(page.text, /View \/ Print/);
});

test('my-certificates shows the empty state for a learner with no certificates yet', async () => {
  const email = `nocerts_${Date.now()}@example.com`;
  const agentNoCerts = request.agent(app);
  await agentNoCerts.post('/api/auth/register').send({ name: 'No Certs Yet', email, password: 'strongpass123' }).expect(200);

  const page = await agentNoCerts.get('/my-certificates').expect(200);
  assert.match(page.text, /haven't earned a certificate yet/i);
});

test('accepts a real quiz score for every level and reports the correct required_topics', async () => {
  const email = `alllevels_${Date.now()}@example.com`;
  const agentAllLevels = request.agent(app);
  await agentAllLevels.post('/api/auth/register').send({ name: 'All Levels', email, password: 'strongpass123' }).expect(200);

  const cases = [
    { levelKey: 'primary', topicKey: 'primary-place-value', score: 6, total: 6, expectedRequired: 6 },
    { levelKey: 'olevel', topicKey: 'number-types', score: 4, total: 5, expectedRequired: 12 },
    { levelKey: 'alevel', topicKey: 'alevel-quadratics', score: 8, total: 10, expectedRequired: 11 },
    { levelKey: 'university', topicKey: 'uni-linear-algebra', score: 7, total: 9, expectedRequired: 8 },
  ];

  for (const { levelKey, topicKey, score, total, expectedRequired } of cases) {
    const res = await agentAllLevels
      .post('/api/progress/save')
      .send({ levelKey, topicKey, score, total })
      .expect(200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.topicsCompleted, 1);
    assert.equal(res.body.topicsRequired, expectedRequired);
    assert.equal(res.body.levelComplete, false);
  }
});
