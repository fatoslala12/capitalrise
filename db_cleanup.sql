-- Database cleanup and optimization scripts

-- Rename company_no to contract_value in contracts table
ALTER TABLE contracts RENAME COLUMN company_no TO contract_value;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_start_date ON contracts(start_date);
CREATE INDEX IF NOT EXISTS idx_work_hours_employee_id ON work_hours(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_hours_date ON work_hours(date);
CREATE INDEX IF NOT EXISTS idx_work_hours_site ON work_hours(site);

-- Add constraints for data integrity
ALTER TABLE contracts ADD CONSTRAINT check_contract_value_positive CHECK (contract_value > 0);
ALTER TABLE contracts ADD CONSTRAINT check_dates_valid CHECK (start_date < finish_date);

-- Update existing data if needed
UPDATE contracts SET contract_value = company_no WHERE contract_value IS NULL AND company_no IS NOT NULL;

-- Clean up any duplicate contract numbers
DELETE FROM contracts a USING contracts b 
WHERE a.id > b.id AND a.contract_number = b.contract_number;

-- Add unique constraint on contract_number
ALTER TABLE contracts ADD CONSTRAINT unique_contract_number UNIQUE (contract_number);

-- Script për pastrimin e të dhënave të gabuara në DB
-- KUJDES: Bëj backup para se të ekzekutosh!

-- 1. Fshi orët e punës që janë në të ardhmen (pas 2025-07-13)
DELETE FROM work_hours WHERE date > '2025-07-13';

-- 2. Fshi pagesat që janë për javë në të ardhmen
DELETE FROM payments WHERE week_label ~ '2025-07-(1[4-9]|[2-9][0-9])' OR week_label ~ '2025-08-';

-- 3. Fshi javët e gabuara të gushtit
DELETE FROM work_hours WHERE date >= '2025-08-01';
DELETE FROM payments WHERE week_label LIKE '%2025-08-%';

-- 4. Kontrollo të dhënat që mbeten (për verifikim)
SELECT 'work_hours' as table_name, date, COUNT(*) as count 
FROM work_hours 
GROUP BY date 
ORDER BY date DESC;

SELECT 'payments' as table_name, week_label, COUNT(*) as count 
FROM payments 
GROUP BY week_label 
ORDER BY week_label DESC;

-- 5. Opsionale: Reset të gjitha orët e punës (nëse dëshiron të fillosh nga zero)
-- UNCOMMIT këto rreshta nëse dëshiron të fshish gjithçka:
-- DELETE FROM work_hours;
-- DELETE FROM payments;
-- ALTER SEQUENCE work_hours_id_seq RESTART WITH 1;
-- ALTER SEQUENCE payments_id_seq RESTART WITH 1;

-- 6. Kontrollo status-in e tabelave
SELECT 'work_hours count' as info, COUNT(*) as total FROM work_hours;
SELECT 'payments count' as info, COUNT(*) as total FROM payments;
SELECT 'employees count' as info, COUNT(*) as total FROM employees;
SELECT 'contracts count' as info, COUNT(*) as total FROM contracts; 