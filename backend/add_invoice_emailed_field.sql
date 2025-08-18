-- Add emailed tracking field to invoices table
-- This will track whether an invoice has been sent via email

ALTER TABLE invoices 
ADD COLUMN emailed BOOLEAN DEFAULT FALSE;

-- Add timestamp for when email was sent
ALTER TABLE invoices 
ADD COLUMN emailed_at TIMESTAMP NULL;

-- Add index for better performance on email status queries
CREATE INDEX IF NOT EXISTS idx_invoices_emailed ON invoices(emailed);

-- Update existing invoices to have emailed = false (already the default)
UPDATE invoices SET emailed = FALSE WHERE emailed IS NULL;

-- Verify the changes
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('emailed', 'emailed_at')
ORDER BY column_name;
