const mysql = require('mysql2/promise');
const { DB_HOST, DB_NAME, DB_USER, DB_PASS } = require('./index');

const pool = mysql.createPool({
  host: DB_HOST,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASS,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

module.exports = pool;
