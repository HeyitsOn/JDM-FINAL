const app = require('./app');
const { PORT, NODE_ENV } = require('./config');
const { sessionStore } = require('./config/session');
const pool = require('./config/database');

const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT} [${NODE_ENV}]`);
});

// MySQLStore's default clearExpired:true runs its own setInterval, independent
// of the pool -- closing the pool alone leaves that timer running and the
// process never exits on SIGTERM/SIGINT (e.g. under PM2/systemd).
function shutdown() {
  server.close(async () => {
    sessionStore.close();
    await pool.end();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
