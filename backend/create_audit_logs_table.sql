-- Create audit_logs table for tracking system activities
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(50) NOT NULL COMMENT 'Action type: CREATE, UPDATE, DELETE, LOGIN, PAYMENT, etc.',
  module VARCHAR(50) NOT NULL COMMENT 'Module: CONTRACTS, EMPLOYEES, TASKS, AUTH, PAYMENTS, etc.',
  description TEXT NOT NULL COMMENT 'Human readable description of the action',
  user_id INT NOT NULL COMMENT 'ID of the user who performed the action',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When the action occurred',
  details JSON COMMENT 'Additional details about the action (optional)',
  
  INDEX idx_action (action),
  INDEX idx_module (module),
  INDEX idx_user_id (user_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_action_module (action, module),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert some sample audit logs for testing
INSERT INTO audit_logs (action, module, description, user_id, timestamp, details) VALUES
('CREATE', 'CONTRACTS', 'Kontratë e re u krijua', 1, NOW() - INTERVAL 1 HOUR, '{"contractNumber": "CTR-2024-001", "clientName": "Test Client"}'),
('UPDATE', 'EMPLOYEES', 'Punonjës u përditësua', 2, NOW() - INTERVAL 2 HOUR, '{"employeeId": 5, "changes": ["hourlyRate", "workplace"]}'),
('DELETE', 'TASKS', 'Detyrë u fshi', 1, NOW() - INTERVAL 3 HOUR, '{"taskId": 12, "taskName": "Test Task"}'),
('LOGIN', 'AUTH', 'Përdorues u kyç në sistem', 3, NOW() - INTERVAL 4 HOUR, '{"ipAddress": "192.168.1.100", "userAgent": "Mozilla/5.0"}'),
('PAYMENT', 'PAYMENTS', 'Pagesë u procesua', 1, NOW() - INTERVAL 5 HOUR, '{"paymentId": 8, "amount": 1500, "method": "bank_transfer"}'),
('CREATE', 'TASKS', 'Detyrë e re u krijua', 2, NOW() - INTERVAL 6 HOUR, '{"taskId": 15, "title": "New Construction Task", "priority": "high"}'),
('UPDATE', 'CONTRACTS', 'Kontratë u përditësua', 1, NOW() - INTERVAL 7 HOUR, '{"contractNumber": "CTR-2024-002", "changes": ["status", "endDate"]}'),
('LOGIN', 'AUTH', 'Përdorues u kyç në sistem', 2, NOW() - INTERVAL 8 HOUR, '{"ipAddress": "192.168.1.101", "userAgent": "Chrome/120.0"}'),
('CREATE', 'EMPLOYEES', 'Punonjës i ri u shtua', 1, NOW() - INTERVAL 9 HOUR, '{"employeeId": 8, "name": "John Doe", "position": "Worker"}'),
('PAYMENT', 'PAYMENTS', 'Pagesë u anuluar', 1, NOW() - INTERVAL 10 HOUR, '{"paymentId": 6, "reason": "client_request", "amount": 800}');

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100) NULL COMMENT 'IP address of requester',
  ADD COLUMN IF NOT EXISTS user_agent TEXT NULL COMMENT 'Raw User-Agent string',
  ADD COLUMN IF NOT EXISTS device_type VARCHAR(50) NULL COMMENT 'Device type: mobile/tablet/desktop',
  ADD COLUMN IF NOT EXISTS device_brand VARCHAR(100) NULL COMMENT 'Device brand e.g., Samsung/Apple',
  ADD COLUMN IF NOT EXISTS device_model VARCHAR(100) NULL COMMENT 'Device model',
  ADD COLUMN IF NOT EXISTS os VARCHAR(100) NULL COMMENT 'Operating system',
  ADD COLUMN IF NOT EXISTS browser VARCHAR(100) NULL COMMENT 'Browser name';