<?php
require_once __DIR__ . '/db.php';
ensure_session();
allow_same_origin_json();

$userId = current_user_id();

if ($userId === null) {
    json_response(['success' => true, 'loggedIn' => false]);
}

$pdo = get_db();
$stmt = $pdo->prepare('SELECT id, name, email FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    // Session pointed at a user that no longer exists — clear it
    session_destroy();
    json_response(['success' => true, 'loggedIn' => false]);
}

json_response([
    'success' => true,
    'loggedIn' => true,
    'user' => ['id' => (int)$user['id'], 'name' => $user['name'], 'email' => $user['email']],
]);
