<?php
require_once __DIR__ . '/db.php';
ensure_session();

$userId = current_user_id();
if ($userId === null) {
    http_response_code(401);
    echo 'Please log in to view your certificate.';
    exit;
}

$levelKey = trim($_GET['level'] ?? '');
$allowedLevels = ['primary', 'olevel', 'alevel', 'university'];
if (!in_array($levelKey, $allowedLevels, true)) {
    http_response_code(400);
    echo 'Unknown course level.';
    exit;
}

$pdo = get_db();

$userStmt = $pdo->prepare('SELECT name FROM users WHERE id = ?');
$userStmt->execute([$userId]);
$user = $userStmt->fetch();
if (!$user) {
    http_response_code(404);
    echo 'Account not found.';
    exit;
}

$reqStmt = $pdo->prepare('SELECT level_label, required_topics FROM level_requirements WHERE level_key = ?');
$reqStmt->execute([$levelKey]);
$levelInfo = $reqStmt->fetch();
if (!$levelInfo) {
    http_response_code(400);
    echo 'Unknown course level.';
    exit;
}

$countStmt = $pdo->prepare('SELECT COUNT(DISTINCT topic_key) AS done FROM progress WHERE user_id = ? AND level_key = ?');
$countStmt->execute([$userId, $levelKey]);
$done = (int)$countStmt->fetch()['done'];

if ($done < (int)$levelInfo['required_topics']) {
    http_response_code(403);
    echo 'You have not completed all topics for this level yet. Keep going — you\'re at '
        . $done . ' of ' . $levelInfo['required_topics'] . ' topics!';
    exit;
}

// Has a certificate already been issued for this user + level? Reuse it (don't create duplicates).
$certStmt = $pdo->prepare('SELECT certificate_code, issued_at FROM certificates WHERE user_id = ? AND level_key = ?');
$certStmt->execute([$userId, $levelKey]);
$cert = $certStmt->fetch();

if (!$cert) {
    // Generate a unique, human-typeable certificate code, e.g. JDM-7X9K-2QRT
    do {
        $code = 'JDM-' . strtoupper(bin2hex(random_bytes(2))) . '-' . strtoupper(bin2hex(random_bytes(2)));
        $check = $pdo->prepare('SELECT id FROM certificates WHERE certificate_code = ?');
        $check->execute([$code]);
    } while ($check->fetch());

    $insert = $pdo->prepare('INSERT INTO certificates (user_id, level_key, certificate_code) VALUES (?, ?, ?)');
    $insert->execute([$userId, $levelKey, $code]);
    $issuedAt = date('Y-m-d H:i:s');
} else {
    $code = $cert['certificate_code'];
    $issuedAt = $cert['issued_at'];
}

$studentName = htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8');
$levelLabel = htmlspecialchars($levelInfo['level_label'], ENT_QUOTES, 'UTF-8');
$issuedDateDisplay = date('j F Y', strtotime($issuedAt));
$verifyUrl = SITE_URL . '/verify-certificate.php?code=' . urlencode($code);
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Certificate of Completion — <?php echo $studentName; ?></title>
<style>
    @page { size: landscape; margin: 0; }
    * { box-sizing: border-box; }
    body {
        margin: 0;
        font-family: 'Georgia', serif;
        background: #e5e9f0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
    }
    .certificate {
        width: 1000px;
        max-width: 100%;
        background: #ffffff;
        border: 14px solid #0033A0;
        outline: 3px solid #F59E0B;
        outline-offset: -24px;
        padding: 70px 80px;
        text-align: center;
        position: relative;
    }
    .brand {
        font-size: 14px;
        letter-spacing: 3px;
        color: #E31937;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 6px;
    }
    .brand-sub { font-size: 12px; color: #64748b; margin-bottom: 30px; letter-spacing: 1px; }
    .title { font-size: 42px; color: #0A1628; margin: 0 0 6px; }
    .subtitle { font-size: 15px; color: #64748b; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 40px; }
    .presented { font-size: 14px; color: #64748b; margin-bottom: 8px; }
    .student-name { font-size: 40px; color: #0033A0; margin: 0 0 30px; font-family: 'Playfair Display', Georgia, serif; border-bottom: 2px solid #F59E0B; display: inline-block; padding-bottom: 10px; }
    .body-text { font-size: 16px; color: #334155; line-height: 1.8; max-width: 650px; margin: 0 auto 40px; }
    .level-name { color: #E31937; font-weight: bold; }
    .footer-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; }
    .footer-col { text-align: center; width: 240px; }
    .footer-line { border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 13px; color: #334155; }
    .footer-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
    .seal { width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg,#0033A0,#E31937); display: flex; align-items: center; justify-content: center; color: white; font-size: 26px; font-weight: bold; margin: 0 auto; }
    .code { font-size: 11px; color: #94a3b8; margin-top: 6px; letter-spacing: 1px; }
    .print-btn-wrap { text-align: center; margin-top: 24px; }
    .print-btn {
        background: #E31937; color: white; border: none; padding: 14px 36px;
        border-radius: 50px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: sans-serif;
    }
    @media print {
        body { background: white; }
        .certificate { border-width: 10px; }
        .print-btn-wrap { display: none; }
    }
</style>
</head>
<body>
    <div class="certificate">
        <div class="brand">JDM Academy</div>
        <div class="brand-sub">Just Do Maths — Free Mathematics Education</div>
        <div class="title">Certificate of Completion</div>
        <div class="subtitle">This certifies that</div>
        <div class="presented">&nbsp;</div>
        <div class="student-name"><?php echo $studentName; ?></div>
        <div class="body-text">
            has successfully completed all topics in the
            <span class="level-name"><?php echo $levelLabel; ?></span>
            course on JDM Academy, demonstrating consistent effort and mastery of the material.
        </div>
        <div class="footer-row">
            <div class="footer-col">
                <div class="footer-line"><?php echo $issuedDateDisplay; ?></div>
                <div class="footer-label">Date Issued</div>
            </div>
            <div class="footer-col">
                <div class="seal">JDM</div>
            </div>
            <div class="footer-col">
                <div class="footer-line">Sir JD, Founder</div>
                <div class="footer-label">JDM Academy</div>
            </div>
        </div>
        <div class="code">Certificate Code: <?php echo htmlspecialchars($code, ENT_QUOTES, 'UTF-8'); ?> &nbsp;·&nbsp; Verify at <?php echo htmlspecialchars($verifyUrl, ENT_QUOTES, 'UTF-8'); ?></div>
    </div>
    <div class="print-btn-wrap">
        <button class="print-btn" onclick="window.print()">🖨️ Save as PDF / Print</button>
    </div>
</body>
</html>
