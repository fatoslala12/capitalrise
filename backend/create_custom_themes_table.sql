-- Create custom themes table for PostgreSQL
CREATE TABLE IF NOT EXISTS custom_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    colors JSONB NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_themes_user_id ON custom_themes(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_themes_is_public ON custom_themes(is_public);
CREATE INDEX IF NOT EXISTS idx_custom_themes_created_at ON custom_themes(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_custom_themes_updated_at 
    BEFORE UPDATE ON custom_themes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add some sample data
INSERT INTO custom_themes (id, user_id, name, colors, is_public) VALUES 
(gen_random_uuid(), 1, 'Ocean Blue', '{"bg-primary": "#f0f9ff", "bg-secondary": "#e0f2fe", "text-primary": "#0c4a6e", "button-primary": "#0284c7", "button-primary-hover": "#0369a1"}', TRUE),
(gen_random_uuid(), 1, 'Forest Green', '{"bg-primary": "#f0fdf4", "bg-secondary": "#dcfce7", "text-primary": "#14532d", "button-primary": "#16a34a", "button-primary-hover": "#15803d"}', TRUE);
