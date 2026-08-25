# JDM Academy Node.js Application

This folder contains the migrated Node.js and Express version of the JDM Academy backend.

## Migration status

This node-app is an implementation of the existing PHP backend in `Backend/`.

### Node.js application

The Node.js app uses:

- Node.js
- Express
- express-session
- mysql2
- bcrypt
- EJS
- dotenv

It is intentionally separated from the PHP implementation to preserve the reference application.

## Quick start

1. Change into the Node app folder:
   ```bash
   cd node-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the `.env.example` file to `.env` and set the required values:
   ```bash
   cp .env.example .env
   ```
4. Import the schema, then the Node-only addition on top of it:
   ```bash
   mysql -u <user> -p <database> < ../Backend/schema.sql
   mysql -u <user> -p <database> < migrations/001_page_visits.sql
   ```
5. Start the server in development mode:
   ```bash
   npm run dev
   ```

## Health check

The running application exposes a basic health endpoint:

- `GET /api/health`

A successful response looks like:

```json
{"status":"ok","uptime":123.45}
```

## Notes

- Authentication, progress tracking, and certificate logic are implemented and route-tested (see `test/`). Existing PHP files remain untouched in `Backend/` as the reference implementation.
- Sessions are stored in MySQL (`express-mysql-session`, reusing the app's own pool) rather than the `express-session` default in-memory store.
- `/register`, `/login`, `/page-visits`, `/api/register.php`, `/api/login.php` are rate-limited (`middleware/rateLimiter.js`).
- See `MIGRATION_AUDIT.md`'s 2026-08-25 addendum for the current, verified state of frontend↔backend integration — notably, quiz scores are not yet wired end-to-end from the quiz UI.
