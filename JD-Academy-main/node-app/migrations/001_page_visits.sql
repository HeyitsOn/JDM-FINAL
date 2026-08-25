-- Node-only addition, not part of the PHP reference schema (Backend/schema.sql).
--
-- Page visits and bookmarks from the site's navigation shell (show()/saveProgress()
-- in the frontend's <script>). Deliberately separate from `progress`: this table has
-- no score/total, because it isn't a quiz result -- it's "the student was here" /
-- "the student bookmarked this page", recorded on every nav and by the bookmark button.
--
-- Apply after Backend/schema.sql:
--   mysql -u <user> -p <database> < node-app/migrations/001_page_visits.sql

CREATE TABLE IF NOT EXISTS page_visits (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    page_key VARCHAR(80) NOT NULL,
    bookmarked TINYINT(1) NOT NULL DEFAULT 0,
    visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_visit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
