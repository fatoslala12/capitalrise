-- Add notification flags to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS overdue_notification_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS upcoming_deadline_notification_sent BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_overdue_notification_sent ON tasks(overdue_notification_sent);
CREATE INDEX IF NOT EXISTS idx_tasks_upcoming_deadline_notification_sent ON tasks(upcoming_deadline_notification_sent);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_status ON tasks(due_date, status);

-- Update existing tasks to have default values
UPDATE tasks 
SET 
  overdue_notification_sent = FALSE,
  upcoming_deadline_notification_sent = FALSE
WHERE overdue_notification_sent IS NULL OR upcoming_deadline_notification_sent IS NULL;

-- Add comment to explain the new columns
COMMENT ON COLUMN tasks.overdue_notification_sent IS 'Flag to track if overdue notification has been sent';
COMMENT ON COLUMN tasks.upcoming_deadline_notification_sent IS 'Flag to track if upcoming deadline notification has been sent';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('overdue_notification_sent', 'upcoming_deadline_notification_sent');