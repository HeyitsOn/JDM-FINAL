-- ============================================================
-- JDM Academy Backend — Database Schema
-- Import this file via cPanel > phpMyAdmin > (select your database) > Import
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Records every quiz a student completes (one row per topic attempt kept as "best score")
CREATE TABLE IF NOT EXISTS progress (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    level_key VARCHAR(50) NOT NULL,     -- e.g. 'primary', 'olevel', 'alevel', 'university'
    topic_key VARCHAR(80) NOT NULL,     -- e.g. 'primary-counting', 'olevel-algebraic'
    score INT UNSIGNED NOT NULL,
    total_questions INT UNSIGNED NOT NULL,
    completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_topic (user_id, topic_key),
    CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Defines how many topics make up each level, so we know when a level is "complete"
-- Adjust these numbers if you add/remove quiz topics later.
CREATE TABLE IF NOT EXISTS level_requirements (
    level_key VARCHAR(50) PRIMARY KEY,
    level_label VARCHAR(80) NOT NULL,
    required_topics INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO level_requirements (level_key, level_label, required_topics) VALUES
    ('primary', 'Primary Mathematics', 6),
    ('olevel', 'O-Level / IGCSE Mathematics', 12),
    ('alevel', 'AS & A-Level Mathematics', 11),
    ('university', 'University Mathematics', 8)
ON DUPLICATE KEY UPDATE level_label = VALUES(level_label), required_topics = VALUES(required_topics);

-- Issued certificates. certificate_code is the public verification code (e.g. shown on the PDF/QR).
CREATE TABLE IF NOT EXISTS certificates (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    level_key VARCHAR(50) NOT NULL,
    certificate_code VARCHAR(20) NOT NULL UNIQUE,
    issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cert_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
