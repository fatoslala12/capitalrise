-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'info', 'warning', 'success', 'error'
    category VARCHAR(50) NOT NULL, -- 'email', 'payment', 'task', 'contract', 'work_hours', 'reminder'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    related_id INTEGER, -- ID of related record (invoice_id, contract_id, etc.)
    related_type VARCHAR(50), -- Type of related record ('invoice', 'contract', 'task', etc.)
    priority INTEGER DEFAULT 1 -- 1: low, 2: medium, 3: high
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Insert sample notifications for testing
INSERT INTO notifications (user_id, title, message, type, category, priority) VALUES
(1, 'Test Notification', 'This is a test notification', 'info', 'system', 1); 