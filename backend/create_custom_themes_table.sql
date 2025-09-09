-- Create custom themes table
CREATE TABLE IF NOT EXISTS custom_themes (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    colors JSON NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_public (is_public),
    INDEX idx_created_at (created_at)
);

-- Add some sample data
INSERT INTO custom_themes (id, user_id, name, colors, is_public) VALUES 
('custom-1', 1, 'Ocean Blue', '{"bg-primary": "#f0f9ff", "bg-secondary": "#e0f2fe", "text-primary": "#0c4a6e", "button-primary": "#0284c7", "button-primary-hover": "#0369a1"}', TRUE),
('custom-2', 1, 'Forest Green', '{"bg-primary": "#f0fdf4", "bg-secondary": "#dcfce7", "text-primary": "#14532d", "button-primary": "#16a34a", "button-primary-hover": "#15803d"}', TRUE);
