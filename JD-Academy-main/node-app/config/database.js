const mysql = require('mysql2/promise');
const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS, DB_CONNECTION_LIMIT } = require('./index');

// Render runs this as a single persistent process (like Docker), so one pool
// with the default limit of 10 is fine. DB_CONNECTION_LIMIT stays
// configurable because most external MySQL providers (managed or
// self-hosted) cap total connections much lower than a local dev instance
// would -- if Render is ever scaled to multiple instances, each one opens
// its own pool, so this needs to come down (limit / instance count <= the
// database's max_connections).
const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASS,
  waitForConnections: true,
  connectionLimit: DB_CONNECTION_LIMIT,
  queueLimit: 0,
  charset: 'utf8mb4'
});

module.exports = pool;
