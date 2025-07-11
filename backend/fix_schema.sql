-- Fix për tabelat employee_workplaces dhe work_hours
-- Problemi: kolonat 'id' janë NOT NULL por nuk kanë DEFAULT
-- Zgjidhja: Lidhim sekuencat ekzistuese me kolonat id

-- 1. Fix employee_workplaces table
ALTER TABLE employee_workplaces 
ALTER COLUMN id SET DEFAULT nextval('building_system.employee_workplaces_id_seq');

-- 2. Fix work_hours table  
ALTER TABLE work_hours 
ALTER COLUMN id SET DEFAULT nextval('building_system.work_hours_id_seq');

-- 3. Sigurohu që sekuencat të jenë në gjendje të duhur
-- (nëse ka të dhëna ekzistuese, vendos sekuencën në vlerën e duhur)
SELECT setval('building_system.employee_workplaces_id_seq', COALESCE((SELECT MAX(id) FROM employee_workplaces), 1), false);
SELECT setval('building_system.work_hours_id_seq', COALESCE((SELECT MAX(id) FROM work_hours), 1), false);

-- 4. Verifikimi - kontrollo strukturën e re
SELECT 
    'employee_workplaces' as table_name,
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'employee_workplaces' AND column_name = 'id';

SELECT 
    'work_hours' as table_name,
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'work_hours' AND column_name = 'id';