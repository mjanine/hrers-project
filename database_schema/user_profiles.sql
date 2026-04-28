USE hrers_project;

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
