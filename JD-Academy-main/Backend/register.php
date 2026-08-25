<?php
require_once __DIR__ . '/db.php';
ensure_session();
allow_same_origin_json();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Invalid request method.'], 405);
}

$body = read_json_body();
$name = trim($body['name'] ?? '');
$email = trim(strtolower($body['email'] ?? ''));
$password = (string)($body['password'] ?? '');

// --- Validation ---
if ($name === '' || mb_strlen($name) > 100) {
    json_response(['success' => false, 'message' => 'Please enter your name.'], 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(['success' => false, 'message' => 'Please enter a valid email address.'], 422);
}
if (mb_strlen($password) < 8) {
    json_response(['success' => false, 'message' => 'Password must be at least 8 characters.'], 422);
}

$pdo = get_db();

// Check for existing account
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    json_response(['success' => false, 'message' => 'An account with that email already exists. Try logging in instead.'], 409);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
$stmt->execute([$name, $email, $hash]);
$userId = (int)$pdo->lastInsertId();

// Log the new user in immediately
session_regenerate_id(true);
$_SESSION['user_id'] = $userId;
$_SESSION['user_name'] = $name;

json_response([
    'success' => true,
    'message' => 'Account created! Welcome to JDM Academy.',
    'user' => ['id' => $userId, 'name' => $name, 'email' => $email],
]);
