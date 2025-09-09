-- Fix custom_themes table to support both employee_id and user_id
-- This allows both admin users and regular employees to create themes

-- 1. Add user_id column to custom_themes table
ALTER TABLE custom_themes 
ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- 2. Add foreign key constraint for user_id
ALTER TABLE custom_themes 
ADD CONSTRAINT IF NOT EXISTS custom_themes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 3. Make employee_id nullable since admin users won't have it
ALTER TABLE custom_themes 
ALTER COLUMN employee_id DROP NOT NULL;

-- 4. Add check constraint to ensure either employee_id or user_id is provided
ALTER TABLE custom_themes 
ADD CONSTRAINT IF NOT EXISTS custom_themes_employee_or_user_check 
CHECK (employee_id IS NOT NULL OR user_id IS NOT NULL);

-- 5. Create index for user_id
CREATE INDEX IF NOT EXISTS idx_custom_themes_user_id ON custom_themes(user_id);

-- 6. Update existing records to use user_id if employee_id is not available
-- This is for existing themes that might have been created with user.id instead of employee_id
UPDATE custom_themes 
SET user_id = (
  SELECT u.id 
  FROM users u 
  WHERE u.employee_id = custom_themes.employee_id
)
WHERE employee_id IS NOT NULL AND user_id IS NULL;

-- 7. For admin users, we'll need to set user_id directly
-- This will be handled in the application code

-- 8. Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'custom_themes' 
ORDER BY ordinal_position;
