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
4. Start the server in development mode:
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

- The Node app is a scaffold and migration-in-progress; authentication, progress, and certificate logic are being migrated.
- Existing PHP files remain untouched in `Backend/`.
