const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

async function setupTaskNotifications() {
  try {
    console.log('🚀 Starting task notification setup...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add_task_notification_flags.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`📋 Executing statement ${i + 1}: ${statement.substring(0, 50)}...`);
          await pool.query(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
            console.log(`⚠️ Statement ${i + 1} skipped (already exists): ${error.message}`);
          } else {
            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          }
        }
      }
    }
    
    console.log('🎉 Task notification setup completed successfully!');
    
    // Verify the changes
    console.log('🔍 Verifying changes...');
    const result = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'tasks' 
      AND column_name IN ('overdue_notification_sent', 'upcoming_deadline_notification_sent')
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ New columns found:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (default: ${row.column_default})`);
      });
    } else {
      console.log('❌ New columns not found');
    }
    
  } catch (error) {
    console.error('💥 Setup failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupTaskNotifications();