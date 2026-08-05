-- init.sql
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schools (id, name, code, is_active, created_at)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'EduSuite K-12 Academy', 'K12-ACAD', true, NOW()),
    ('22222222-2222-2222-2222-222222222222', 'EduSuite State University', 'ESU', true, NOW())
ON CONFLICT (id) DO NOTHING;