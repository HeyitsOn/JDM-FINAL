const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Fail fast with a clear message rather than a cryptic MySQL connection
// error surfacing later on the first request that touches the database.
const requiredEnv = ['SESSION_SECRET', 'DB_NAME', 'DB_USER'];
requiredEnv.forEach((name) => {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
});

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  SESSION_SECRET: process.env.SESSION_SECRET,
  SESSION_LIFETIME: Number(process.env.SESSION_LIFETIME || 60 * 60 * 24 * 30),
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT || 3306),
  DB_NAME: process.env.DB_NAME || '',
  DB_USER: process.env.DB_USER || '',
  DB_PASS: process.env.DB_PASS || '',
  DB_CONNECTION_LIMIT: Number(process.env.DB_CONNECTION_LIMIT || 10),
  SITE_URL: process.env.SITE_URL || 'http://localhost:3000'
};
