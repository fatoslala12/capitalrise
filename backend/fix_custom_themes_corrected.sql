-- Fix custom_themes table to support both employee_id and user_id
-- PostgreSQL compatible version

-- 1. Add user_id column to custom_themes table
ALTER TABLE custom_themes 
ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- 2. Add foreign key constraint for user_id (without IF NOT EXISTS)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'custom_themes_user_id_fkey' 
        AND table_name = 'custom_themes'
    ) THEN
        ALTER TABLE custom_themes 
        ADD CONSTRAINT custom_themes_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Make employee_id nullable since admin users won't have it
ALTER TABLE custom_themes 
ALTER COLUMN employee_id DROP NOT NULL;

-- 4. Add check constraint (without IF NOT EXISTS)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'custom_themes_employee_or_user_check' 
        AND table_name = 'custom_themes'
    ) THEN
        ALTER TABLE custom_themes 
        ADD CONSTRAINT custom_themes_employee_or_user_check 
        CHECK (employee_id IS NOT NULL OR user_id IS NOT NULL);
    END IF;
END $$;

-- 5. Create index for user_id
CREATE INDEX IF NOT EXISTS idx_custom_themes_user_id ON custom_themes(user_id);

-- 6. Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'custom_themes' 
ORDER BY ordinal_position;
