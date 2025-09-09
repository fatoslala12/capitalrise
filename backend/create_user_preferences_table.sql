-- Create user preferences table for PostgreSQL
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    preference_key VARCHAR(255) NOT NULL,
    preference_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE (employee_id, preference_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_employee_id ON user_preferences(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_preference_key ON user_preferences(preference_key);

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
