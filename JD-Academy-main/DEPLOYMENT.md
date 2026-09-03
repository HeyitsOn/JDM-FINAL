# JDM Academy — Deployment Guide (Node.js application)

**Target host: Render**, deploying the existing `node-app/Dockerfile` as a Render Web Service.

cPanel is no longer a deployment target for the Node application (see `MIGRATION_AUDIT.md`'s Stage 8 for why: shared cPanel hosting only runs Node via an optional "Setup Node.js App" feature that was never confirmed to exist on the account this was originally scoped for, and Render removes that uncertainty entirely). `Backend/` — the original PHP implementation — remains untouched as reference only; it was never deployed via this doc and still isn't.

An earlier, unfinished attempt at deploying to Vercel (`node-app/api/index.js`, `node-app/vercel.json`) has been removed. Vercel's serverless model can't reach a MySQL database over `localhost`, and shared-hosting MySQL instances generally have no stable IP to allowlist for a serverless caller — see the exact reasoning if you need it, it's preserved in this session's chat, not repeated here since it no longer applies to the current, Render-based direction.

---

## 1. Environment variables

Every variable the app actually reads (`node-app/config/index.js`):

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | Must be `production` — controls secure-cookie behavior (`node-app/config/session.js`) |
| `PORT` | no (defaults to 3000) | Render's Docker runtime needs this set explicitly to match what the container listens on — see §5 |
| `SESSION_SECRET` | **yes, app throws on boot without it** | Long random string. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Must be a fresh value — never reuse a development or example value |
| `DB_HOST` | no (defaults to `localhost`, not valid in production — see §2) | |
| `DB_PORT` | no (defaults to `3306`) | |
| `DB_NAME` | **yes, app throws on boot without it** | |
| `DB_USER` | **yes, app throws on boot without it** | |
| `DB_PASS` | no (some setups legitimately have no password) | Note the actual variable name is `DB_PASS`, not `DB_PASSWORD` |
| `DB_CONNECTION_LIMIT` | no (defaults to `10`) | See the comment in `node-app/config/database.js` for how to size this against your database provider's connection cap |
| `DB_SSL` | no (defaults to off) | Set to exactly `true` for TiDB Serverless / most managed MySQL-compatible hosts, which require TLS. Leave unset for local/Docker MySQL |
| `SITE_URL` | no (defaults to `http://localhost:3000`, not valid in production) | Must be the real public HTTPS domain — used to build certificate-verification links |
| `SESSION_LIFETIME` | no (defaults to 2592000s / 30 days) | |

Template lives at `node-app/.env.example` — placeholders only, already confirmed `.gitignore`-protected (`git check-ignore -v node-app/.env` → matches). **Never commit a real `.env`, and never enter real values into `render.yaml`** — the repo's `render.yaml` marks every secret-shaped variable `sync: false` on purpose so Render prompts for it in the dashboard instead of reading it from the file.

## 2. Where the database lives

Render has no first-party managed MySQL (it offers managed Postgres and Redis, not MySQL), so this app's MySQL instance has to live somewhere else. Three supported options:

**Option A1 — TiDB Serverless (recommended: free, no card required for the free tier, MySQL-wire-compatible).** [tidbcloud.com](https://tidbcloud.com) → create a Serverless cluster → its "Connect" panel gives you a host, port (usually `4000`), user, and password, plus a downloadable CA cert (not needed — Node's built-in trusted CA bundle already covers it). Requires TLS: set `DB_SSL=true`. This is what `node-app/config/database.js`'s `ssl` option and `DB_SSL` env var exist for specifically.

**Option A2 — another external managed MySQL provider.** Aiven, AWS RDS, DigitalOcean Managed MySQL, etc. Same pattern as A1 — point `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASS` at it, set `DB_SSL=true` if the provider requires TLS (most do). Comes with the provider's own backups/failover.

**Option B — self-hosted MySQL as a second Render service.** Render supports private services with a persistent disk attached, reachable from your web service over Render's private network without being exposed to the public internet. You'd run `mysql:8` (the same image `docker-compose.yml` already uses locally) as that private service, with the disk mounted at MySQL's data directory so data survives restarts/redeploys, and set `DB_HOST` to that service's internal hostname (`DB_SSL` stays unset — this connection never leaves Render's private network). This is a paid Render service (private services with a disk aren't on the free tier), and you own backups/upgrades/restarts yourself — Option A trades a bit of that ownership for free.

Whichever you pick, the schema itself doesn't change:

```bash
# 1. Create the database and a dedicated user (adjust names/password) --
#    run this against whichever MySQL host you chose above, from a client
#    that can reach it (your own machine, if the provider allows remote
#    connections, or a one-off shell against the Render private service).
#
#    TiDB Serverless (Option A1): its "Connect" panel already gives you a
#    ready-to-use user/password -- skip straight to step 2, using that
#    connection's own database name (or CREATE DATABASE with it if you want
#    a specific name like jdmacad). Add --ssl-mode=VERIFY_IDENTITY to every
#    command below if the provided mysql client needs it explicitly.
mysql -h <host> -P <port> -u <admin> -p -e "
  CREATE DATABASE jdmacad CHARACTER SET utf8mb4;
  CREATE USER 'jdmuser'@'%' IDENTIFIED BY '<strong-password>';
  GRANT ALL PRIVILEGES ON jdmacad.* TO 'jdmuser'@'%';
  FLUSH PRIVILEGES;
"

# 2. Import the PHP reference schema (unmodified -- do not edit this file)
mysql -h <host> -P <port> -u jdmuser -p jdmacad < Backend/schema.sql

# 3. Import the Node-only addition on top of it (page visits / bookmarks --
#    deliberately kept separate from Backend/schema.sql so the PHP reference
#    stays untouched; see MIGRATION_AUDIT.md's Stage 4 section for why)
mysql -h <host> -P <port> -u jdmuser -p jdmacad < node-app/migrations/001_page_visits.sql
```

Expect exactly 5 tables afterward: `users`, `progress`, `level_requirements`, `certificates`, `page_visits`. A 6th table, `sessions`, is created automatically the first time the app starts (`express-mysql-session`'s `createDatabaseTable: true`) — don't create it manually.

`'jdmuser'@'%'` (any host) is used above instead of `'jdmuser'@'localhost'` because the app connects from a different host than the database in options A1/A2 — narrow this to your Render service's actual egress if your provider exposes one. Not applicable to TiDB Serverless (its provided user already works from anywhere) or Option B (private-network-only, so `'jdmuser'@'localhost'` from inside that same private service is fine).

## 3. Local application setup (for development/testing, not deployment)

```bash
cd node-app
npm install
cp .env.example .env
# edit .env with real values -- a local MySQL instance is fine here
npm run dev
```

## 4. Docker image

`node-app/Dockerfile` builds and runs the app the same way locally, in CI, or on Render:

```bash
cd node-app
docker build -t jdm-academy .

docker run -d --name jdm-academy \
  --env-file .env \
  -p 3000:3000 \
  jdm-academy
```

Notes:
- The image runs as a non-root `nodeapp` user and declares a `HEALTHCHECK` that polls `/api/health` — `docker ps` shows the container's health status directly.
- **Verified 2026-08-28**: `docker build` succeeds (0 `npm audit` vulnerabilities in the image), and the built image was run against a throwaway `mysql:8` container on a Docker network — `Backend/schema.sql` and `node-app/migrations/001_page_visits.sql` loaded cleanly, the app connected and booted, `express-mysql-session` auto-created the `sessions` table, `/api/health` returned `{"status":"ok",...}`, and the container's own `HEALTHCHECK` reported `healthy`. Not yet tested through this container: registering a real user / completing a quiz (only boot + DB connectivity + health were checked at that point — the full learner flow was separately verified against a non-containerized MySQL instance, see `MIGRATION_AUDIT.md` Stage 5).

## 5. Render deployment

1. **Create the Render service.** In the Render dashboard, New → Web Service (or New → Blueprint if using the `render.yaml` at the repo root — check its field names against Render's current Blueprint schema before relying on it, since Render has changed the `env`/`runtime` key naming over time).
2. **Connect the GitHub repository** (`OnikaBAU/Jj`) and pick the branch to deploy from.
3. **Configure Docker.** The git repo root is the `Just jA` folder that contains `JD-Academy-main/` — not `JD-Academy-main` itself. So: set **Root Directory** to `JD-Academy-main/node-app`, and once that's set, **Dockerfile Path** to just `Dockerfile` (relative to that root directory). If configuring the raw path fields instead of Root Directory, use `JD-Academy-main/node-app/Dockerfile` and build context `JD-Academy-main/node-app` (matches `render.yaml`'s `dockerfilePath`/`dockerContext` if using the Blueprint, which lives at the actual repo root, not inside `JD-Academy-main/`).
4. **Configure environment variables** from the §1 table in the Render dashboard's Environment tab: `NODE_ENV=production`, `PORT=3000` (must match the Dockerfile's `EXPOSE`), `SESSION_SECRET` (fresh value, never reused), `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASS` (from §2), `DB_CONNECTION_LIMIT`, `DB_SSL=true` (if using TiDB Serverless/Option A — omit for Option B), `SITE_URL` (the real `https://<your-service>.onrender.com` URL or custom domain — you'll know this once the service exists, so it may need setting after the first deploy), `SESSION_LIFETIME`.
5. **Configure MySQL** per §2 — provision it before the first deploy, since the app throws on boot if `DB_NAME`/`DB_USER` are missing and fails every request if it can't connect.
6. **Run/import the database schema** per §2's three `mysql` commands, against whichever host you provisioned.
7. **Run migrations** — for this app, that's the single `node-app/migrations/001_page_visits.sql` file imported in the step above; there is no separate migration runner.
8. **Deploy.** Trigger the first deploy (push to the connected branch, or use the dashboard's manual deploy).
9. **Check logs** in the Render dashboard's Logs tab. On a healthy boot you should see the `server.js` startup line (`Server listening on http://localhost:<PORT> [production]`) and no uncaught errors. A missing/invalid `SESSION_SECRET` or bad DB credentials will throw immediately at boot — that's a deliberate fail-fast (`config/index.js`), not a hang.
10. **Test the health endpoint:**
    ```bash
    curl https://<your-service>.onrender.com/api/health
    # expect: {"status":"ok","uptime":<number>}
    ```
11. **Test authentication** — register a real account, then log in, against `/register` and `/login` (the contract `node-app/public/index.html` actually calls — see `routes/legacy.js`), and confirm `/session-check` reflects the logged-in state.
12. **Test progress** — submit a quiz score via `/save-progress` while logged in, then confirm `/get-progress` reflects it, including that a lower repeat score doesn't overwrite a higher one (see `MIGRATION_AUDIT.md` Stage 5 for the exact behavior being verified).
13. **Test certificates** — complete every topic required for a level (`level_requirements.required_topics`; Primary and O-Level are the two levels that can currently be completed in full, see §7 below), confirm `/generate-certificate?level=<level>` issues one, and confirm `/verify-certificate?code=<code>` validates it without requiring login.
14. **Troubleshooting:**
    - `/api/health` unreachable / service won't start → check logs (step 9) first; almost always a missing env var or a database the app can't reach yet.
    - Database connection errors → confirm `DB_HOST`/`DB_PORT` are reachable from Render (not just from your own machine — a provider's IP allowlist or a private-network hostname only resolvable from inside Render are common gaps), that the grant in §2 covers the host the connection actually comes from, and that `DB_SSL=true` is set if the provider requires TLS (TiDB Serverless and most managed hosts do — without it the connection fails outright, which surfaces to users as a generic "Registration failed" / "try again" message even though the real error is in the server logs, not the browser).
    - Sessions not persisting across requests → confirm `NODE_ENV=production` is actually set (cookies are `secure: true` only in production, so an HTTPS deploy without it can silently drop the session cookie) and that `SITE_URL` matches the real origin the browser is using.
    - Rate-limit errors on login/register from real users → `middleware/rateLimiter.js` caps auth endpoints at 10 attempts / 15 minutes per the limiter's own IP tracking; confirm `app.set('trust proxy', 1)` (`app.js`) is in effect, since without it behind Render's proxy every request can appear to come from the same address and share one limit.

## 6. Health check

```bash
curl https://<your-render-service>.onrender.com/api/health
# expect: {"status":"ok","uptime":<number>}
```

## 7. Production safety checklist

- [ ] `NODE_ENV=production` set (enables `secure: true` on the session cookie)
- [ ] `SESSION_SECRET` is a fresh, production-specific random value
- [ ] `.env` is not committed; `.gitignore` confirmed to cover it
- [ ] `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASS` point at the real production database, not a local/dev one
- [ ] `SITE_URL` is the real HTTPS domain, not `localhost`
- [ ] `npm audit` clean (see `MIGRATION_AUDIT.md`)
- [ ] `npm test` passing against a production-shaped database structure (the DB-dependent suite needs a real MySQL instance — see `MIGRATION_AUDIT.md`'s Stage 5 section for how this was verified against an isolated local instance; it has not been run against the actual production database, and shouldn't be until that database is confirmed safe to write test data into, or a separate staging database is used instead)

## 8. Known, intentional limitations at deployment time

- **A-Level and University certificates cannot currently be earned** — `level_requirements.required_topics` (11 and 8) exceeds the number of quizzes that exist for those levels in any form, live or unbuilt placeholder (10 and 7). This is a **content decision**, not a deployment blocker for the rest of the app — Primary and O-Level work fully. See `MIGRATION_AUDIT.md`.
- Sessions are MySQL-backed (safe across multiple instances), but the rate limiter's in-memory store is not shared across instances — if Render is ever scaled to more than one instance of this service, each instance enforces the login/register rate limit independently rather than as one shared limit. Not a concern for a single-instance deploy.
