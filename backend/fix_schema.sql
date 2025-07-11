-- Fix COMPREHENSIVE për të gjitha tabelat me probleme id column
-- Problemi: kolonat 'id' janë NOT NULL por nuk kanë DEFAULT
-- Zgjidhja: Lidhim sekuencat ekzistuese me kolonat id

-- 1. Fix employee_workplaces table
ALTER TABLE employee_workplaces 
ALTER COLUMN id SET DEFAULT nextval('building_system.employee_workplaces_id_seq');

-- 2. Fix work_hours table  
ALTER TABLE work_hours 
ALTER COLUMN id SET DEFAULT nextval('building_system.work_hours_id_seq');

-- 3. Fix payments table (shkaku i error-it të fundit)
ALTER TABLE payments 
ALTER COLUMN id SET DEFAULT nextval('building_system.payments_id_seq');

-- 4. Fix attachments table
ALTER TABLE attachments 
ALTER COLUMN id SET DEFAULT nextval('building_system.attachments_id_seq');

-- 5. Fix expenses_invoices table
ALTER TABLE expenses_invoices 
ALTER COLUMN id SET DEFAULT nextval('building_system.expenses_invoices_id_seq');

-- 6. Fix invoices table
ALTER TABLE invoices 
ALTER COLUMN id SET DEFAULT nextval('building_system.invoices_id_seq');

-- 7. Fix tasks table (është identity column, nuk ka nevojë për fix)
-- ALTER TABLE tasks 
-- ALTER COLUMN id SET DEFAULT nextval('building_system.tasks_id_seq');

-- 8. Sigurohu që sekuencat të jenë në gjendje të duhur
SELECT setval('building_system.employee_workplaces_id_seq', COALESCE((SELECT MAX(id) FROM employee_workplaces), 1), false);
SELECT setval('building_system.work_hours_id_seq', COALESCE((SELECT MAX(id) FROM work_hours), 1), false);
SELECT setval('building_system.payments_id_seq', COALESCE((SELECT MAX(id) FROM payments), 1), false);
SELECT setval('building_system.attachments_id_seq', COALESCE((SELECT MAX(id) FROM attachments), 1), false);
SELECT setval('building_system.expenses_invoices_id_seq', COALESCE((SELECT MAX(id) FROM expenses_invoices), 1), false);
SELECT setval('building_system.invoices_id_seq', COALESCE((SELECT MAX(id) FROM invoices), 1), false);
-- SELECT setval('building_system.tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 1), false);

-- 9. Verifikimi - kontrollo strukturën e re për të gjitha tabelat
SELECT 
    table_name,
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('employee_workplaces', 'work_hours', 'payments', 'attachments', 'expenses_invoices', 'invoices', 'tasks') 
  AND column_name = 'id'
ORDER BY table_name;