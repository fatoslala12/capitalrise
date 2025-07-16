-- Krijo tabelën week_notes për komentet e javës
CREATE TABLE IF NOT EXISTS week_notes (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    week_label VARCHAR(50) NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, week_label)
);

-- Shto indeks për performancë
CREATE INDEX IF NOT EXISTS idx_week_notes_employee_week ON week_notes(employee_id, week_label); 