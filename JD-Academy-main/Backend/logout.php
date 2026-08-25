<?php
require_once __DIR__ . '/db.php';
ensure_session();
allow_same_origin_json();

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie('PHPSESSID', '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
}
session_destroy();

json_response(['success' => true, 'message' => 'Logged out.']);
