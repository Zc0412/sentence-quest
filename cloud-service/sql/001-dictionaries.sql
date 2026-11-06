-- 在目标 MySQL 数据库执行一次；不修改已有题库或云文件。
CREATE TABLE IF NOT EXISTS dictionaries (
    id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    kind ENUM('word', 'phrase') NOT NULL,
    category VARCHAR(100) NOT NULL,
    wordCount INT UNSIGNED NOT NULL,
    sha256 CHAR(64) CHARACTER SET ascii NOT NULL,
    fileID TEXT NOT NULL,
    cloudPath TEXT NOT NULL,
    status ENUM('published', 'draft', 'archived') NOT NULL DEFAULT 'published',
    createdAt VARCHAR(24) NOT NULL,
    updatedAt VARCHAR(24) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
