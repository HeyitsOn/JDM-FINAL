# JDM Academy PHP to Node.js and Express Migration Plan

## 1. Project overview

The current application is a compact PHP backend that serves two different kinds of experiences:

- JSON-based API endpoints for authentication, progress tracking, and session checks
- Rendered HTML pages for certificate generation and certificate verification

There is no framework router, no MVC structure, and the current Frontend folder contains a single public landing page: `Frontend/Landingpage.html`. This suggests the backend serves API and certificate pages while the marketing or landing experience is provided by a separate frontend asset.

The system’s core purpose is to support a mathematics learning platform with:

- user registration and login
- session-based authentication
- quiz progress tracking by topic and level
- level completion logic
- certificate issuance and public verification

## 2. Current site inventory

### Pages and routes

The PHP files act as direct routes or entry points. The practical routes are:

- /Backend/register.php
- /Backend/login.php
- /Backend/logout.php
- /Backend/session-check.php
- /Backend/save-progress.php
- /Backend/get-progress.php
- /Backend/generate-certificate.php?level=primary
- /Backend/verify-certificate.php?code=...

### Current UI shape

- There are no traditional HTML login or registration forms in the workspace.
- The backend is designed for JSON-based frontend calls using fetch.
- The only visible HTML form is the certificate verification form in the verification page.
- The certificate page is a printable HTML page with a print button.

## 3. Functional map

### Authentication and account management

- Register a user
- Log a user in
- Log a user out
- Check if a user is logged in
- Preserve the current session and user metadata

### Learning progress

- Save a completed quiz result for a topic
- Remember the best score if the same topic is attempted again
- Compute whether a level is complete based on required topic counts
- Retrieve a student’s progress by level

### Certificates

- Generate a certificate when all required topics for a level are complete
- Reuse the same certificate if one already exists
- Make the certificate publicly verifiable through a code lookup

## 4. Routing and page plan for Node.js and Express

The Node.js rebuild should preserve the existing behavior while moving to a conventional Express structure.

### Recommended Express routes

Authentication

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/session

Progress

- POST /api/progress/save
- GET /api/progress/me

Certificates

- GET /api/certificates/:level
- GET /certificates/verify?code=...
- GET /certificates/:level/render

Legacy-compatible routes

- /register
- /login
- /logout
- /session-check
- /save-progress
- /get-progress
- /generate-certificate
- /verify-certificate

These can be implemented as Express routes that either preserve the old URLs or support new API-style paths.

## 5. Forms and user interactions

### Existing forms and flows

1. Registration flow
   - JSON body with name, email, password
   - Server validates input and creates the user
   - Server logs the user in immediately

2. Login flow
   - JSON body with email and password
   - Server validates input and starts a session

3. Progress saving flow
   - JSON body with levelKey, topicKey, score, total
   - Server stores or updates the progress entry

4. Certificate verification flow
   - GET request with a code query parameter
   - Server looks up the certificate and displays the result

5. Certificate viewing flow
   - GET request with a level query parameter
   - Server validates completion, generates a certificate if needed, and renders an HTML page

### Recommended Express implementation

- Use body parsing middleware for JSON requests
- Use a session middleware such as express-session
- Use EJS or another template engine for the certificate pages and verification page
- Keep the certificate pages server-rendered for simplicity and to preserve the current HTML experience

## 6. Authentication design

### Current implementation

Authentication is session-based and uses PHP sessions with secure cookie settings.

Key characteristics:

- Session cookies are configured in config.php
- Login state is checked by helpers in db.php
- The app uses secure cookies, HttpOnly, SameSite Lax, and HTTPS assumptions
- Passwords are hashed with password_hash and password_verify
- Session regeneration happens on login
- The design avoids exposing account existence details on failed login

### Recommended Node.js and Express equivalent

- Use express-session with a secure configuration
- Store session data server-side or in a session store such as connect-mysql or connect-redis
- Use bcrypt for password hashing
- Maintain the same user profile fields: id, name, email
- Preserve the same login and session check behavior in controllers

## 7. Database interactions

### Current database model

The MySQL schema contains four core tables:

- users
- progress
- level_requirements
- certificates

### Current behavior per table

Users

- Create a new account
- Lookup a user by email for login
- Lookup a user by id for session checks and certificate generation
- Update last_login_at after login

Progress

- Insert progress for a topic when first completed
- Update the score if a later attempt is better
- Count distinct completed topics for a specific level
- Retrieve all progress rows for a user

Level requirements

- Read the required topic count for each level
- Use that value to decide when a level is complete

Certificates

- Insert a new certificate record when the student completes a level
- Reuse a certificate if it already exists
- Lookup a certificate by public code for verification

### Recommended Node.js database stack

- Use mysql2 or Sequelize for database access
- Keep the schema structure the same to minimize migration risk
- Use environment variables for database credentials
- Replace the PHP-specific PDO pattern with repository or service-layer modules

## 8. External integrations

### Current state

There are no third-party external integrations in the current PHP codebase.

The system relies on:

- MySQL database access
- Browser-based rendering for printable HTML certificates
- Standard PHP session handling

### Recommended Node.js approach

- Keep the MySQL integration as the primary external dependency
- No mail, payment, analytics, or social login services are present today
- If future features are added, they can be introduced as separate modules later

## 9. Business logic to preserve

### User registration

- Validate name, email, and password length
- Reject duplicate emails
- Hash the password
- Create the user and start a session

### Login

- Validate input
- Check email and password against stored hash
- Update the last login date
- Start a session

### Progress saving

- Allow only known level keys
- Require a valid topic key and valid numeric score values
- Keep the highest score per topic
- Compute level completion based on the required topic count

### Certificate generation

- Only allow a certificate if the student has completed the required number of topics for the selected level
- Reuse an existing certificate instead of creating duplicates
- Generate a unique code in a human-readable format
- Render a printable certificate HTML page

### Certificate verification

- Look up a certificate by code
- Show the student, course, and issue date if found
- Show an invalid message otherwise

## 10. Recommended application structure for Node.js and Express

A clean migration structure could be:

- server.js or app.js
- routes/
  - auth.routes.js
  - progress.routes.js
  - certificate.routes.js
- controllers/
  - auth.controller.js
  - progress.controller.js
  - certificate.controller.js
- services/
  - auth.service.js
  - progress.service.js
  - certificate.service.js
- models/
  - user.model.js
  - progress.model.js
  - certificate.model.js
- middleware/
  - auth.middleware.js
  - error.middleware.js
- views/
  - certificate.ejs
  - verify-certificate.ejs
- config/
  - database.js
  - session.js
- public/
  - css/
  - js/

## 11. File-by-file migration inventory

| PHP file | Current purpose | Main dependencies | Recommended Node.js equivalent |
|---|---|---|---|
| Backend/config.php | Stores database credentials, site URL, session settings, timezone, cookie settings | None directly; consumed by db.php | Environment configuration module and session config module |
| Backend/db.php | Creates the database connection, exposes JSON helpers, session helpers, auth helpers, and CORS handling | config.php | Database connection utility, response helpers, session helpers, auth middleware |
| Backend/register.php | Registers a new user, validates input, checks duplicate email, hashes password, creates the session | db.php, config.php | Auth controller plus service layer, POST /api/auth/register |
| Backend/login.php | Authenticates a user, verifies password, updates last login, creates the session | db.php, config.php | Auth controller, POST /api/auth/login |
| Backend/logout.php | Clears the session and removes the session cookie | db.php | Auth controller, POST /api/auth/logout |
| Backend/session-check.php | Returns whether the current user is logged in and provides user data | db.php | Auth controller or auth middleware, GET /api/auth/session |
| Backend/save-progress.php | Saves or updates a quiz result, computes level completion state | db.php | Progress controller, POST /api/progress/save |
| Backend/get-progress.php | Retrieves the student’s progress by level and the certificates they already earned | db.php | Progress controller, GET /api/progress/me |
| Backend/generate-certificate.php | Verifies completion, creates or reuses a certificate, and renders an HTML certificate page | db.php, config.php | Certificate controller and EJS view, GET /api/certificates/:level or /certificates/:level/render |
| Backend/verify-certificate.php | Accepts a certificate code and displays validation results | db.php | Certificate controller and EJS view, GET /certificates/verify |
| Backend/schema.sql | Defines the database tables and initial level requirements data | MySQL server | Same schema migrated to MySQL or a migration tool such as Knex or Sequelize migrations |

## 12. Suggested implementation phases

### Phase 1: Foundation

- Set up a Node.js + Express project structure
- Add environment-based configuration for database and session settings
- Create a MySQL connection utility
- Add middleware for session handling and authentication

### Phase 2: Core authentication

- Implement register, login, logout, and session-check routes
- Recreate the same validation and password handling behavior
- Preserve the secure session cookie behavior

### Phase 3: Progress system

- Implement progress save and retrieval routes
- Rebuild the level completion logic using the same table structure
- Add the same “best score wins” behavior for topic retries

### Phase 4: Certificates

- Implement certificate generation and verification routes
- Recreate the printable certificate HTML page using a template engine
- Preserve the human-readable certificate code format and public verification flow

### Phase 5: Testing and hardening

- Add integration tests for auth, progress, and certificate flows
- Verify session behavior, permission checks, and edge cases
- Confirm that the new system matches the old behavior for valid and invalid requests

## 13. Risks and migration notes

- The current PHP backend is not a full application framework, so some behavior is scattered across individual files. A clean Express reimplementation should centralize this logic into controllers and services.
- The existing database schema is simple and should be preserved as-is to avoid data migration issues.
- The current certificate page is fully HTML-rendered. Rebuilding it in Express with a template engine is the lowest-risk path.
- The current routes are file-based rather than framework-based. A migration should either preserve those URLs or introduce a clear new route structure.
- The project currently has no frontend assets or SPA client, so the migration can focus on the backend and server-rendered pages first.

## 14. Recommended target architecture

The most practical target stack is:

- Node.js
- Express
- express-session
- mysql2
- bcrypt
- EJS for server-rendered pages
- dotenv for environment configuration

This approach preserves the current behavior while replacing the PHP backend with a modern Node.js service that is easier to maintain and extend.

## 15. Summary

The current PHP site is a focused learning platform backend with:

- session-based authentication
- MySQL-backed persistence
- topic-level quiz progress tracking
- level completion logic
- certificate issuance and verification

The migration to Node.js and Express should focus on recreating those same responsibilities in a more modular structure with dedicated routes, controllers, services, and views. The database schema can remain largely unchanged, and the existing business rules should be preserved carefully to avoid regressions.
