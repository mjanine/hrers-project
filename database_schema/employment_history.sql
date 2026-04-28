USE hrers_project;

CREATE TABLE IF NOT EXISTS employment_history (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    event_date DATE NOT NULL,
    event_title VARCHAR(120) NOT NULL,
    event_description TEXT NULL,
    source VARCHAR(60) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_employment_history_user_id (user_id),
    KEY idx_employment_history_event_date (event_date),
    CONSTRAINT fk_employment_history_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
