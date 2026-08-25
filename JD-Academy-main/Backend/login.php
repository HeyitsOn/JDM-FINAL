<?php
require_once __DIR__ . '/db.php';
ensure_session();
allow_same_origin_json();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Invalid request method.'], 405);
}

$body = read_json_body();
$email = trim(strtolower($body['email'] ?? ''));
$password = (string)($body['password'] ?? '');

if ($email === '' || $password === '') {
    json_response(['success' => false, 'message' => 'Please enter your email and password.'], 422);
}

$pdo = get_db();
$stmt = $pdo->prepare('SELECT id, name, password_hash FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

// Deliberately vague error message — never reveal whether the email exists (basic security practice)
if (!$user || !password_verify($password, $user['password_hash'])) {
    json_response(['success' => false, 'message' => 'Incorrect email or password.'], 401);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['user_name'] = $user['name'];

$update = $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?');
$update->execute([$user['id']]);

json_response([
    'success' => true,
    'message' => 'Welcome back, ' . $user['name'] . '!',
    'user' => ['id' => (int)$user['id'], 'name' => $user['name'], 'email' => $email],
]);
