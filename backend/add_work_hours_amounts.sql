-- Add amount tracking fields to work_hours table
-- This will track gross and net amounts for each work hour entry

-- 1. Add gross_amount field (hours * rate)
ALTER TABLE work_hours 
ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(10,2) DEFAULT 0;

-- 2. Add net_amount field (gross_amount * percentage based on employee type)
ALTER TABLE work_hours 
ADD COLUMN IF NOT EXISTS net_amount NUMERIC(10,2) DEFAULT 0;

-- 3. Add employee_type field to cache the NI/UTR status
ALTER TABLE work_hours 
ADD COLUMN IF NOT EXISTS employee_type VARCHAR(10) DEFAULT 'UTR';

-- 4. Update existing work_hours with calculated amounts
-- First, set the employee_type based on the employees table
UPDATE work_hours 
SET employee_type = COALESCE(
  (SELECT COALESCE(label_type, labelType, 'UTR') 
   FROM employees 
   WHERE employees.id = work_hours.employee_id), 
  'UTR'
)
WHERE employee_type IS NULL OR employee_type = '';

-- 5. Calculate gross_amount = hours * rate (use employee rate if work_hours.rate is null)
UPDATE work_hours 
SET gross_amount = COALESCE(hours, 0) * COALESCE(
  NULLIF(work_hours.rate, 0), 
  (SELECT COALESCE(hourly_rate, 15) FROM employees WHERE employees.id = work_hours.employee_id),
  15
)
WHERE gross_amount IS NULL OR gross_amount = 0;

-- 6. Calculate net_amount based on employee_type
-- UTR = 80% of gross, NI = 70% of gross
UPDATE work_hours 
SET net_amount = CASE 
  WHEN employee_type = 'NI' THEN gross_amount * 0.70
  ELSE gross_amount * 0.80
END
WHERE net_amount IS NULL OR net_amount = 0;

-- 7. Create indexes for better performance (after columns exist)
DO $$ 
BEGIN
    -- Only create indexes if columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_hours' AND column_name = 'gross_amount') THEN
        CREATE INDEX IF NOT EXISTS idx_work_hours_gross_amount ON work_hours(gross_amount);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_hours' AND column_name = 'net_amount') THEN
        CREATE INDEX IF NOT EXISTS idx_work_hours_net_amount ON work_hours(net_amount);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_hours' AND column_name = 'employee_type') THEN
        CREATE INDEX IF NOT EXISTS idx_work_hours_employee_type ON work_hours(employee_type);
    END IF;
END $$;

-- 8. Verify the changes
SELECT 
  id,
  employee_id,
  date,
  hours,
  rate,
  gross_amount,
  net_amount,
  employee_type
FROM work_hours 
ORDER BY id DESC
LIMIT 10;

-- 9. Show summary statistics
SELECT 
  employee_type,
  COUNT(*) as entries,
  SUM(hours) as total_hours,
  SUM(gross_amount) as total_gross,
  SUM(net_amount) as total_net,
  AVG(rate) as avg_rate
FROM work_hours 
GROUP BY employee_type
ORDER BY employee_type;
