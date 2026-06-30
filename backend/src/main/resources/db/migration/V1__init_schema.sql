CREATE TABLE schools (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app_users (
    id UUID PRIMARY KEY,
    -- Kept nullable so global platform ADMINs don't have to belong to a specific school
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL, 
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    -- ADDED: To store the BCrypt encrypted password string
    password VARCHAR(255) NOT NULL, 
    -- ADDED: To store authorization tiers (e.g., 'ROLE_ADMIN', 'ROLE_VIEWER')
    role VARCHAR(50) NOT NULL, 
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE report_templates (
    id UUID PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- DRAFT or PUBLISHED
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE report_jobs (
    id UUID PRIMARY KEY,
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- PENDING, COMPLETED, or FAILED
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);