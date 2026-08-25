<?php
require_once __DIR__ . '/db.php';
ensure_session();
allow_same_origin_json();

$userId = require_login();
$pdo = get_db();

$stmt = $pdo->prepare('SELECT level_key, topic_key, score, total_questions, completed_at FROM progress WHERE user_id = ? ORDER BY completed_at DESC');
$stmt->execute([$userId]);
$rows = $stmt->fetchAll();

// Group by level and compute completion per level
$reqStmt = $pdo->query('SELECT level_key, level_label, required_topics FROM level_requirements');
$levels = [];
foreach ($reqStmt->fetchAll() as $r) {
    $levels[$r['level_key']] = [
        'levelKey' => $r['level_key'],
        'levelLabel' => $r['level_label'],
        'requiredTopics' => (int)$r['required_topics'],
        'topicsCompleted' => 0,
        'topics' => [],
    ];
}

foreach ($rows as $row) {
    $lk = $row['level_key'];
    if (!isset($levels[$lk])) {
        continue;
    }
    $levels[$lk]['topics'][] = [
        'topicKey' => $row['topic_key'],
        'score' => (int)$row['score'],
        'total' => (int)$row['total_questions'],
        'completedAt' => $row['completed_at'],
    ];
    $levels[$lk]['topicsCompleted']++;
}

foreach ($levels as $lk => $lvl) {
    $levels[$lk]['levelComplete'] = $lvl['topicsCompleted'] >= $lvl['requiredTopics'];
}

// Which certificates has this student already earned?
$certStmt = $pdo->prepare('SELECT level_key, certificate_code, issued_at FROM certificates WHERE user_id = ?');
$certStmt->execute([$userId]);
$certificates = $certStmt->fetchAll();

json_response([
    'success' => true,
    'levels' => array_values($levels),
    'certificates' => $certificates,
]);
