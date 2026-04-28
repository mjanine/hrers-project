USE hrers_project;

-- =========================================================
-- Existing database migration for profile tables
-- Adds missing columns/tables without dropping data.
-- Run this once on your live database.
-- =========================================================

SET @db_name := DATABASE();

-- ---------------------------------------------------------
-- profile_documents: add HR review metadata columns
-- ---------------------------------------------------------
SET @sql := (
    SELECT IF(
        EXISTS(
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @db_name
              AND TABLE_NAME = 'profile_documents'
              AND COLUMN_NAME = 'reviewed_by_user_id'
        ),
        'SELECT 1',
        'ALTER TABLE profile_documents ADD COLUMN reviewed_by_user_id INT NULL'
    )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS(
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @db_name
              AND TABLE_NAME = 'profile_documents'
              AND COLUMN_NAME = 'reviewed_by_name'
        ),
        'SELECT 1',
        'ALTER TABLE profile_documents ADD COLUMN reviewed_by_name VARCHAR(150) NULL'
    )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS(
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @db_name
              AND TABLE_NAME = 'profile_documents'
              AND COLUMN_NAME = 'review_notes'
        ),
        'SELECT 1',
        'ALTER TABLE profile_documents ADD COLUMN review_notes TEXT NULL'
    )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS(
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @db_name
              AND TABLE_NAME = 'profile_documents'
              AND COLUMN_NAME = 'reviewed_at'
        ),
        'SELECT 1',
        'ALTER TABLE profile_documents ADD COLUMN reviewed_at DATETIME NULL'
    )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS(
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @db_name
              AND TABLE_NAME = 'profile_documents'
              AND COLUMN_NAME = 'file_url'
        ),
        'SELECT 1',
        'ALTER TABLE profile_documents ADD COLUMN file_url VARCHAR(500) NULL'
    )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add reviewer index if needed
SET @sql := (
    SELECT IF(
        EXISTS(
            SELECT 1
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = @db_name
              AND TABLE_NAME = 'profile_documents'
              AND INDEX_NAME = 'idx_profile_documents_reviewed_by_user_id'
        ),
        'SELECT 1',
        'CREATE INDEX idx_profile_documents_reviewed_by_user_id ON profile_documents (reviewed_by_user_id)'
    )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------
-- user_profiles: table for editable contact fields
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    contact_number VARCHAR(50) NULL,
    address VARCHAR(255) NULL,
    emergency_name VARCHAR(150) NULL,
    emergency_phone VARCHAR(50) NULL,
    photo_url VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_profiles_user_id (user_id),
    CONSTRAINT fk_user_profiles_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
