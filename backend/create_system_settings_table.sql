-- Krijo tabelën për system settings
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    company_info JSONB,
    work_hours_rules JSONB,
    security_settings JSONB,
    backup_settings JSONB,
    performance_settings JSONB,
    email_settings JSONB,
    maintenance_settings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Krijo trigger për të përditësuar updated_at
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_system_settings_updated_at();

-- Shto koment për tabelën
COMMENT ON TABLE system_settings IS 'Tabela për ruajtjen e system settings';
COMMENT ON COLUMN system_settings.company_info IS 'Informacioni i kompanisë';
COMMENT ON COLUMN system_settings.work_hours_rules IS 'Rregullat e orëve të punës';
COMMENT ON COLUMN system_settings.security_settings IS 'Cilësimet e sigurisë';
COMMENT ON COLUMN system_settings.backup_settings IS 'Cilësimet e backup';
COMMENT ON COLUMN system_settings.performance_settings IS 'Cilësimet e performancës';
COMMENT ON COLUMN system_settings.email_settings IS 'Cilësimet e email';
COMMENT ON COLUMN system_settings.maintenance_settings IS 'Cilësimet e mirëmbajtjes';
