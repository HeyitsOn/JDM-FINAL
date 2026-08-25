<?php
require_once __DIR__ . '/config.php';

function get_db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Database connection failed. Please check config.php.']);
            exit;
        }
    }
    return $pdo;
}

// Sends a JSON response and stops execution.
function json_response(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Reads and JSON-decodes the request body (used by all POST endpoints).
function read_json_body(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// Starts the PHP session if not already started. Call at the top of any endpoint that needs login state.
function ensure_session(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

// Returns the logged-in user's ID, or null if nobody is logged in.
function current_user_id(): ?int {
    ensure_session();
    return $_SESSION['user_id'] ?? null;
}

// Stops the request with a 401 unless the user is logged in. Returns the user ID.
function require_login(): int {
    $userId = current_user_id();
    if ($userId === null) {
        json_response(['success' => false, 'message' => 'You need to log in first.'], 401);
    }
    return $userId;
}

// Basic CORS + preflight handling so the frontend (same domain) can call these endpoints via fetch().
function allow_same_origin_json(): void {
    header('Content-Type: application/json');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
