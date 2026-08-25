<?php
require_once __DIR__ . '/db.php';
ensure_session();
allow_same_origin_json();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Invalid request method.'], 405);
}

$userId = require_login();
$body = read_json_body();

$levelKey = trim($body['levelKey'] ?? '');
$topicKey = trim($body['topicKey'] ?? '');
$score = (int)($body['score'] ?? -1);
$total = (int)($body['total'] ?? -1);

$allowedLevels = ['primary', 'olevel', 'alevel', 'university'];
if (!in_array($levelKey, $allowedLevels, true)) {
    json_response(['success' => false, 'message' => 'Unknown level.'], 422);
}
if ($topicKey === '' || mb_strlen($topicKey) > 80) {
    json_response(['success' => false, 'message' => 'Unknown topic.'], 422);
}
if ($score < 0 || $total <= 0 || $score > $total) {
    json_response(['success' => false, 'message' => 'Invalid score.'], 422);
}

$pdo = get_db();

// Keep the BEST score if the student retakes a quiz
$stmt = $pdo->prepare('SELECT score FROM progress WHERE user_id = ? AND topic_key = ?');
$stmt->execute([$userId, $topicKey]);
$existing = $stmt->fetch();

if ($existing) {
    if ($score > (int)$existing['score']) {
        $update = $pdo->prepare('UPDATE progress SET score = ?, total_questions = ?, completed_at = NOW() WHERE user_id = ? AND topic_key = ?');
        $update->execute([$score, $total, $userId, $topicKey]);
    }
} else {
    $insert = $pdo->prepare('INSERT INTO progress (user_id, level_key, topic_key, score, total_questions) VALUES (?, ?, ?, ?, ?)');
    $insert->execute([$userId, $levelKey, $topicKey, $score, $total]);
}

// Check whether this completes the whole level (for certificate eligibility)
$countStmt = $pdo->prepare('SELECT COUNT(DISTINCT topic_key) AS done FROM progress WHERE user_id = ? AND level_key = ?');
$countStmt->execute([$userId, $levelKey]);
$done = (int)$countStmt->fetch()['done'];

$reqStmt = $pdo->prepare('SELECT required_topics FROM level_requirements WHERE level_key = ?');
$reqStmt->execute([$levelKey]);
$reqRow = $reqStmt->fetch();
$required = $reqRow ? (int)$reqRow['required_topics'] : null;

$levelComplete = $required !== null && $done >= $required;

json_response([
    'success' => true,
    'message' => 'Progress saved.',
    'topicsCompleted' => $done,
    'topicsRequired' => $required,
    'levelComplete' => $levelComplete,
]);
