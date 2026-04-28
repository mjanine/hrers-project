USE hrers_project;

CREATE TABLE IF NOT EXISTS profile_documents (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'Submitted',
    file_content LONGBLOB NULL,
    file_size INT NULL,
    reviewed_by_user_id INT NULL,
    reviewed_by_name VARCHAR(150) NULL,
    review_notes TEXT NULL,
    reviewed_at DATETIME NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_profile_documents_user_id (user_id),
    KEY idx_profile_documents_reviewed_by_user_id (reviewed_by_user_id),
    KEY idx_profile_documents_uploaded_at (uploaded_at),
    CONSTRAINT fk_profile_documents_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ,CONSTRAINT fk_profile_documents_reviewer
        FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
