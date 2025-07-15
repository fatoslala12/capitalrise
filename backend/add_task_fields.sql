-- Shto fusha të reja në tabelën tasks
-- Ekzekuto këtë script për të shtuar prioritetin dhe kategorinë

-- 1. Shto kolonën priority
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- 2. Shto kolonën category
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'construction', 'maintenance', 'cleaning', 'safety', 'admin'));

-- 3. Përditëso detyrat ekzistuese me vlera default
UPDATE tasks 
SET priority = 'medium' 
WHERE priority IS NULL;

UPDATE tasks 
SET category = 'general' 
WHERE category IS NULL;

-- 4. Bëj kolonat NOT NULL pasi kemi vlera default
ALTER TABLE tasks 
ALTER COLUMN priority SET NOT NULL;

ALTER TABLE tasks 
ALTER COLUMN category SET NOT NULL;

-- 5. Verifikimi - kontrollo strukturën e re
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks' 
  AND column_name IN ('priority', 'category')
ORDER BY column_name;

-- 6. Kontrollo disa rreshta për të verifikuar
SELECT id, title, priority, category, created_at 
FROM tasks 
ORDER BY created_at DESC 
LIMIT 5; 