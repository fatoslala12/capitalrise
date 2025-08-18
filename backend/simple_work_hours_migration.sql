-- Simple and safe work hours amounts migration
-- Run each statement one by one

-- 1. Add gross_amount column
ALTER TABLE work_hours 
ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(10,2) DEFAULT 0;

-- 2. Add net_amount column  
ALTER TABLE work_hours 
ADD COLUMN IF NOT EXISTS net_amount NUMERIC(10,2) DEFAULT 0;

-- 3. Add employee_type column
ALTER TABLE work_hours 
ADD COLUMN IF NOT EXISTS employee_type VARCHAR(10) DEFAULT 'UTR';

-- 4. Update employee_type from employees table
UPDATE work_hours 
SET employee_type = COALESCE(
  (SELECT COALESCE(label_type, labelType, 'UTR') 
   FROM employees 
   WHERE employees.id = work_hours.employee_id), 
  'UTR'
)
WHERE employee_type IS NULL OR employee_type = '' OR employee_type = 'UTR';

-- 5. Calculate gross_amount = hours * rate
UPDATE work_hours 
SET gross_amount = COALESCE(hours, 0) * COALESCE(
  NULLIF(work_hours.rate, 0), 
  (SELECT COALESCE(hourly_rate, 15) FROM employees WHERE employees.id = work_hours.employee_id),
  15
)
WHERE gross_amount IS NULL OR gross_amount = 0;

-- 6. Calculate net_amount based on employee_type  
UPDATE work_hours 
SET net_amount = CASE 
  WHEN employee_type = 'NI' THEN gross_amount * 0.70
  ELSE gross_amount * 0.80
END
WHERE net_amount IS NULL OR net_amount = 0;
