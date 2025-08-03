-- Shto kolonat e munguara në tabelën users
-- Problemi: Shumë kolona që përdoren në controllers nuk ekzistojnë në tabelën users

-- 1. Shto kolonat bazë që mungojnë
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS position VARCHAR(100),
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS qualification TEXT,
ADD COLUMN IF NOT EXISTS next_of_kin VARCHAR(100),
ADD COLUMN IF NOT EXISTS next_of_kin_phone VARCHAR(50);

-- 2. Përditëso kolonat ekzistuese me vlera default nëse janë NULL
UPDATE users 
SET first_name = 'User' 
WHERE first_name IS NULL;

UPDATE users 
SET last_name = 'User' 
WHERE last_name IS NULL;

UPDATE users 
SET status = 'active' 
WHERE status IS NULL;

-- 3. Bëj kolonat e rëndësishme NOT NULL pasi i kemi përditësuar
ALTER TABLE users 
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL,
ALTER COLUMN status SET NOT NULL;

-- 4. Shto indekse për performancë më të mirë
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);

-- 5. Verifikimi - kontrollo strukturën e re të tabelës users
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 6. Kontrollo të dhënat ekzistuese
SELECT id, email, first_name, last_name, role, employee_id, status 
FROM users 
LIMIT 5;

-- 7. Kontrollo nëse ka ndonjë problem me të dhënat
SELECT COUNT(*) as total_users,
       COUNT(first_name) as users_with_first_name,
       COUNT(last_name) as users_with_last_name,
       COUNT(status) as users_with_status
FROM users;