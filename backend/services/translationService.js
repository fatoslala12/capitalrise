const pool = require('../db');

class TranslationService {
  // Initialize translations table if it doesn't exist
  async initializeTranslationsTable() {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS translations (
          id SERIAL PRIMARY KEY,
          table_name VARCHAR(100) NOT NULL,
          record_id INTEGER NOT NULL,
          field_name VARCHAR(100) NOT NULL,
          language_code VARCHAR(10) NOT NULL DEFAULT 'sq',
          translated_value TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(table_name, record_id, field_name, language_code)
        );
        
        CREATE INDEX IF NOT EXISTS idx_translations_table_record 
        ON translations(table_name, record_id);
        
        CREATE INDEX IF NOT EXISTS idx_translations_language 
        ON translations(language_code);
      `;
      
      await pool.query(createTableQuery);
      console.log('✅ Translations table initialized successfully');
      
      // Insert default Albanian translations for existing data
      await this.migrateExistingData();
      
    } catch (error) {
      console.error('❌ Error initializing translations table:', error);
      throw error;
    }
  }

  // Migrate existing data to translations table
  async migrateExistingData() {
    try {
      console.log('🔄 Starting data migration to translations table...');
      
      // Migrate employees data
      await this.migrateEmployeesData();
      
      // Migrate contracts data
      await this.migrateContractsData();
      
      // Migrate tasks data
      await this.migrateTasksData();
      
      console.log('✅ Data migration completed successfully');
      
    } catch (error) {
      console.error('❌ Error during data migration:', error);
      throw error;
    }
  }

  // Migrate employees data
  async migrateEmployeesData() {
    try {
      const employees = await pool.query('SELECT id, name, position, address FROM employees');
      
      for (const employee of employees.rows) {
        // Insert Albanian translations (original data)
        await this.insertTranslation('employees', employee.id, 'name', 'sq', employee.name);
        await this.insertTranslation('employees', employee.id, 'position', 'sq', employee.position);
        await this.insertTranslation('employees', employee.id, 'address', 'sq', employee.address);
        
        // Insert English translations (placeholder for now)
        await this.insertTranslation('employees', employee.id, 'name', 'en', employee.name);
        await this.insertTranslation('employees', employee.id, 'position', 'en', employee.position);
        await this.insertTranslation('employees', employee.id, 'address', 'en', employee.address);
      }
      
      console.log(`✅ Migrated ${employees.rows.length} employees`);
      
    } catch (error) {
      console.error('❌ Error migrating employees data:', error);
    }
  }

  // Migrate contracts data
  async migrateContractsData() {
    try {
      const contracts = await pool.query('SELECT id, title, description, company, address FROM contracts');
      
      for (const contract of contracts.rows) {
        // Insert Albanian translations (original data)
        await this.insertTranslation('contracts', contract.id, 'title', 'sq', contract.title);
        await this.insertTranslation('contracts', contract.id, 'description', 'sq', contract.description);
        await this.insertTranslation('contracts', contract.id, 'company', 'sq', contract.company);
        await this.insertTranslation('contracts', contract.id, 'address', 'sq', contract.address);
        
        // Insert English translations (placeholder for now)
        await this.insertTranslation('contracts', contract.id, 'title', 'en', contract.title);
        await this.insertTranslation('contracts', contract.id, 'description', 'en', contract.description);
        await this.insertTranslation('contracts', contract.id, 'company', 'en', contract.company);
        await this.insertTranslation('contracts', contract.id, 'address', 'en', contract.address);
      }
      
      console.log(`✅ Migrated ${contracts.rows.length} contracts`);
      
    } catch (error) {
      console.error('❌ Error migrating contracts data:', error);
    }
  }

  // Migrate tasks data
  async migrateTasksData() {
    try {
      const tasks = await pool.query('SELECT id, title, description, category FROM tasks');
      
      for (const task of tasks.rows) {
        // Insert Albanian translations (original data)
        await this.insertTranslation('tasks', task.id, 'title', 'sq', task.title);
        await this.insertTranslation('tasks', task.id, 'description', 'sq', task.description);
        await this.insertTranslation('tasks', task.id, 'category', 'sq', task.category);
        
        // Insert English translations (placeholder for now)
        await this.insertTranslation('tasks', task.id, 'title', 'en', task.title);
        await this.insertTranslation('tasks', task.id, 'description', 'en', task.description);
        await this.insertTranslation('tasks', task.id, 'category', 'en', task.category);
      }
      
      console.log(`✅ Migrated ${tasks.rows.length} tasks`);
      
    } catch (error) {
      console.error('❌ Error migrating tasks data:', error);
    }
  }

  // Insert or update translation
  async insertTranslation(tableName, recordId, fieldName, languageCode, translatedValue) {
    try {
      const query = `
        INSERT INTO translations (table_name, record_id, field_name, language_code, translated_value)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (table_name, record_id, field_name, language_code)
        DO UPDATE SET 
          translated_value = EXCLUDED.translated_value,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await pool.query(query, [tableName, recordId, fieldName, languageCode, translatedValue]);
      
    } catch (error) {
      console.error('❌ Error inserting translation:', error);
      throw error;
    }
  }

  // Get translation for a specific field
  async getTranslation(tableName, recordId, fieldName, languageCode = 'sq') {
    try {
      const query = `
        SELECT translated_value 
        FROM translations 
        WHERE table_name = $1 
          AND record_id = $2 
          AND field_name = $3 
          AND language_code = $4
      `;
      
      const result = await pool.query(query, [tableName, recordId, fieldName, languageCode]);
      
      if (result.rows.length > 0) {
        return result.rows[0].translated_value;
      }
      
      // If no translation found, return null
      return null;
      
    } catch (error) {
      console.error('❌ Error getting translation:', error);
      return null;
    }
  }

  // Get all translations for a record
  async getRecordTranslations(tableName, recordId, languageCode = 'sq') {
    try {
      const query = `
        SELECT field_name, translated_value 
        FROM translations 
        WHERE table_name = $1 
          AND record_id = $2 
          AND language_code = $3
      `;
      
      const result = await pool.query(query, [tableName, recordId, languageCode]);
      
      const translations = {};
      result.rows.forEach(row => {
        translations[row.field_name] = row.translated_value;
      });
      
      return translations;
      
    } catch (error) {
      console.error('❌ Error getting record translations:', error);
      return {};
    }
  }

  // Get all translations for multiple records
  async getMultipleRecordTranslations(tableName, recordIds, languageCode = 'sq') {
    try {
      if (!recordIds || recordIds.length === 0) {
        return {};
      }
      
      const placeholders = recordIds.map((_, index) => `$${index + 2}`).join(',');
      const query = `
        SELECT record_id, field_name, translated_value 
        FROM translations 
        WHERE table_name = $1 
          AND record_id IN (${placeholders})
          AND language_code = $${recordIds.length + 2}
      `;
      
      const params = [tableName, ...recordIds, languageCode];
      const result = await pool.query(query, params);
      
      const translations = {};
      result.rows.forEach(row => {
        if (!translations[row.record_id]) {
          translations[row.record_id] = {};
        }
        translations[row.record_id][row.field_name] = row.translated_value;
      });
      
      return translations;
      
    } catch (error) {
      console.error('❌ Error getting multiple record translations:', error);
      return {};
    }
  }

  // Update translation
  async updateTranslation(tableName, recordId, fieldName, languageCode, translatedValue) {
    try {
      const query = `
        UPDATE translations 
        SET translated_value = $5, updated_at = CURRENT_TIMESTAMP
        WHERE table_name = $1 
          AND record_id = $2 
          AND field_name = $3 
          AND language_code = $4
      `;
      
      const result = await pool.query(query, [tableName, recordId, fieldName, languageCode, translatedValue]);
      
      return result.rowCount > 0;
      
    } catch (error) {
      console.error('❌ Error updating translation:', error);
      throw error;
    }
  }

  // Delete translation
  async deleteTranslation(tableName, recordId, fieldName, languageCode) {
    try {
      const query = `
        DELETE FROM translations 
        WHERE table_name = $1 
          AND record_id = $2 
          AND field_name = $3 
          AND language_code = $4
      `;
      
      const result = await pool.query(query, [tableName, recordId, fieldName, languageCode]);
      
      return result.rowCount > 0;
      
    } catch (error) {
      console.error('❌ Error deleting translation:', error);
      throw error;
    }
  }

  // Delete all translations for a record
  async deleteRecordTranslations(tableName, recordId) {
    try {
      const query = `
        DELETE FROM translations 
        WHERE table_name = $1 
          AND record_id = $2
      `;
      
      const result = await pool.query(query, [tableName, recordId]);
      
      return result.rowCount;
      
    } catch (error) {
      console.error('❌ Error deleting record translations:', error);
      throw error;
    }
  }

  // Get available languages
  async getAvailableLanguages() {
    try {
      const query = `
        SELECT DISTINCT language_code 
        FROM translations 
        ORDER BY language_code
      `;
      
      const result = await pool.query(query);
      
      return result.rows.map(row => row.language_code);
      
    } catch (error) {
      console.error('❌ Error getting available languages:', error);
      return ['sq']; // Default to Albanian
    }
  }

  // Get translation statistics
  async getTranslationStats() {
    try {
      const query = `
        SELECT 
          language_code,
          COUNT(*) as total_translations,
          COUNT(CASE WHEN translated_value IS NOT NULL AND translated_value != '' THEN 1 END) as completed_translations
        FROM translations 
        GROUP BY language_code
        ORDER BY language_code
      `;
      
      const result = await pool.query(query);
      
      return result.rows;
      
    } catch (error) {
      console.error('❌ Error getting translation stats:', error);
      return [];
    }
  }
}

module.exports = new TranslationService();