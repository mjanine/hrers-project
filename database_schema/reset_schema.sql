CREATE DATABASE IF NOT EXISTS hrers_project;
USE hrers_project;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS training_registrations;
DROP TABLE IF EXISTS employment_history;
DROP TABLE IF EXISTS profile_documents;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS position_change_requests;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS training_sessions;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT,
    employee_no VARCHAR(50) NULL,
    full_name VARCHAR(150) NOT NULL,
    username VARCHAR(80) NOT NULL,
    email VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'school_director', 'hr_evaluator', 'hr_head', 'department_head', 'employee') NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    must_change_password TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_employee_no (employee_no),
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departments (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NULL,
    location VARCHAR(200) NULL,
    budget DECIMAL(12,2) NULL,
    head_user_id INT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_departments_name (name),
    KEY idx_departments_head_user_id (head_user_id),
    CONSTRAINT fk_departments_head_user
        FOREIGN KEY (head_user_id) REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leave_requests (
    id INT NOT NULL AUTO_INCREMENT,
    requester_user_id INT NOT NULL,
    requester_name VARCHAR(150) NOT NULL,
    requester_role VARCHAR(80) NOT NULL,
    leave_type VARCHAR(80) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    num_days INT NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    reason TEXT NOT NULL,
    file_name VARCHAR(255) NULL,
    reviewed_by_user_id INT NULL,
    reviewed_by_name VARCHAR(150) NULL,
    review_remarks TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_leave_requester (requester_user_id),
    KEY idx_leave_status (status),
    KEY idx_leave_dates (start_date, end_date),
    CONSTRAINT fk_leave_request_user
        FOREIGN KEY (requester_user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_leave_review_user
        FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profile_documents (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'Submitted',
    file_url VARCHAR(500) NULL,
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
        ,
    CONSTRAINT fk_profile_documents_reviewer
        FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS position_change_requests (
    id INT NOT NULL AUTO_INCREMENT,
    requester_user_id INT NOT NULL,
    employee_name VARCHAR(150) NOT NULL,
    employee_no VARCHAR(50) NULL,
    current_position VARCHAR(120) NULL,
    current_department VARCHAR(120) NULL,
    requested_position VARCHAR(120) NOT NULL,
    effective_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    reviewed_by_user_id INT NULL,
    reviewed_by_name VARCHAR(150) NULL,
    review_remarks TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_pcr_requester (requester_user_id),
    KEY idx_pcr_status (status),
    CONSTRAINT fk_pcr_requester_user
        FOREIGN KEY (requester_user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_pcr_reviewer_user
        FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_sessions (
    id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    training_type VARCHAR(50) NOT NULL,
    training_date DATE NOT NULL,
    description TEXT NULL,
    provider VARCHAR(200) NULL,
    location VARCHAR(255) NULL,
    contact VARCHAR(255) NULL,
    total_slots INT NOT NULL DEFAULT 0,
    filled_slots INT NOT NULL DEFAULT 0,
    status ENUM('Open', 'Full', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Open',
    remarks TEXT NULL,
    created_by_user_id INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_training_sessions_title (title),
    KEY idx_training_sessions_status (status),
    CONSTRAINT fk_training_sessions_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_records (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    record_date DATE NOT NULL,
    time_in DATETIME NULL,
    time_out DATETIME NULL,
    worked_seconds INT NOT NULL DEFAULT 0,
    status ENUM('Present', 'Late', 'Leave', 'Holiday', 'Absent') NOT NULL DEFAULT 'Present',
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_attendance_user_date (user_id, record_date),
    KEY idx_attendance_user (user_id),
    KEY idx_attendance_date (record_date),
    CONSTRAINT fk_attendance_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NULL,
    username VARCHAR(80) NULL,
    email VARCHAR(255) NULL,
    actor_user_id INT NULL,
    actor_name VARCHAR(150) NULL,
    activity_type VARCHAR(64) NOT NULL,
    activity_label VARCHAR(120) NOT NULL,
    status_type VARCHAR(20) NOT NULL DEFAULT 'success',
    description TEXT NULL,
    ip_address VARCHAR(64) NULL,
    user_agent VARCHAR(255) NULL,
    login_time DATETIME NULL,
    logout_time DATETIME NULL,
    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_audit_logs_user_id (user_id),
    KEY idx_audit_logs_actor_user_id (actor_user_id),
    KEY idx_audit_logs_activity_type (activity_type),
    KEY idx_audit_logs_status_type (status_type),
    KEY idx_audit_logs_occurred_at (occurred_at),
    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_audit_logs_actor_user
        FOREIGN KEY (actor_user_id) REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_registrations (
    id INT NOT NULL AUTO_INCREMENT,
    training_session_id INT NOT NULL,
    user_id INT NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'Registered',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_training_registrations_user_session (training_session_id, user_id),
    KEY idx_training_registrations_user (user_id),
    CONSTRAINT fk_training_registrations_session
        FOREIGN KEY (training_session_id) REFERENCES training_sessions(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_training_registrations_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO training_sessions (
    title, category, training_type, training_date, description, provider, location, contact, total_slots, filled_slots, status, remarks
) VALUES
('Outcomes-Based Education Workshop', 'Teaching', 'Onsite', '2026-03-12', 'College of Computer Studies', 'CCS - 201', 'Main building 2nd floor', 'ccs.admin@email.com', 30, 25, 'Open', 'Workshop on OBE implementation for faculty.'),
('Advanced Research Methods Seminar', 'Research', 'Online', '2026-04-05', 'Graduate School Office', 'GSO - Research Division', 'https://meet.uphsd.edu/research-seminar', 'gso.research@email.com', 40, 18, 'Open', 'Publication skills and grant writing basics.'),
('Leadership & Management Training', 'Leadership', 'Onsite', '2026-04-20', 'Human Resources Department', 'HR - Training Division', 'Admin Building Conference Room', 'hr.training@email.com', 25, 10, 'Open', 'Leadership development for supervisors and coordinators.'),
('Digital Literacy & Technology Integration', 'Technology', 'Hybrid', '2026-05-08', 'Information Technology Office', 'ITO - Digital Learning', 'Computer Lab 3 / Online Stream', 'ito.training@email.com', 50, 30, 'Open', 'Digital tools and classroom technology integration.'),
('Faculty Development Program', 'Development', 'Onsite', '2026-02-28', 'Annual faculty development seminar concluded.', 'External Agency', 'Auditorium', 'facdev@email.com', 20, 20, 'Completed', 'Annual faculty development seminar concluded.'),
('Safety & Emergency Response Training', 'Safety', 'Onsite', '2026-03-05', 'Cancelled due to venue unavailability.', 'Safety Officer', 'Gymnasium', 'safety@email.com', 25, 15, 'Cancelled', 'Cancelled due to venue unavailability.')
ON DUPLICATE KEY UPDATE
    category = VALUES(category),
    training_type = VALUES(training_type),
    training_date = VALUES(training_date),
    description = VALUES(description),
    provider = VALUES(provider),
    location = VALUES(location),
    contact = VALUES(contact),
    total_slots = VALUES(total_slots),
    filled_slots = VALUES(filled_slots),
    status = VALUES(status),
    remarks = VALUES(remarks);
