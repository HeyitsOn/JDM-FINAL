<?php
/**
 * ============================================================
 * JDM Academy Backend — Configuration
 * ============================================================
 * EDIT THE FOUR LINES BELOW with the database details from
 * cPanel > MySQL Databases (the wizard shows you all four
 * after you create the database and user).
 *
 * Do NOT rename this file. Do NOT put it inside a publicly
 * browsable "www"-style folder without the rest of the backend.
 * ============================================================
 */

define('DB_HOST', 'localhost');                       // almost always 'localhost' on cPanel
define('DB_NAME', 'cpanelusername_jdmacad');           // cPanel auto-prefixes your database name
define('DB_USER', 'cpanelusername_jdmuser');           // cPanel auto-prefixes your database username
define('DB_PASS', 'PASTE_YOUR_DATABASE_PASSWORD_HERE');

// The exact domain the academy lives on (used for cookies/security). No trailing slash.
define('SITE_URL', 'https://jdmacademy.co.za');

// Session cookie lifetime in seconds. 30 days.
define('SESSION_LIFETIME', 60 * 60 * 24 * 30);

date_default_timezone_set('Africa/Johannesburg');

session_set_cookie_params([
    'lifetime' => SESSION_LIFETIME,
    'path'     => '/',
    'secure'   => true,      // only send cookie over HTTPS
    'httponly' => true,      // JavaScript cannot read the session cookie (XSS protection)
    'samesite' => 'Lax',
]);
