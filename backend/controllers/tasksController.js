const { pool } = require('../db'); // Updated to use new structure
const NotificationService = require('../services/notificationService');

exports.getAllTasks = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks');
    console.log('[DEBUG] /api/tasks - rows:', result.rows.length);
    result.rows.forEach((row, idx) => {
      console.log(`[DEBUG] Task Row ${idx}:`, row);
    });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTasksByEmployee = async (req, res) => {
  const { employeeId } = req.params;
  try {
    const result = await pool.query(`
      SELECT * FROM tasks
      WHERE assigned_to = $1
      ORDER BY created_at DESC`,
      [employeeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addTask = async (req, res) => {
  const { assigned_to, title, description, status, site_name, due_date, assigned_by, priority, category } = req.body;
  console.log('[DEBUG] addTask payload:', req.body);
  try {
    const result = await pool.query(`
      INSERT INTO tasks (assigned_to, title, description, status, site_name, due_date, assigned_by, priority, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [assigned_to, title, description, status, site_name, due_date, assigned_by, priority || 'medium', category || 'general']
    );
    
    const newTask = result.rows[0];
    
    // Dërgo notification për task të ri
    if (assigned_to) {
      try {
        await NotificationService.notifyUserTaskAssignment(assigned_to, title);
        console.log(`[DEBUG] Notification sent for task assignment to user ${assigned_to}`);
      } catch (notificationError) {
        console.error('[ERROR] Failed to send task notification:', notificationError);
      }
    }
    
    res.status(201).json(newTask);
  } catch (err) {
    console.error('[DEBUG] addTask error:', err.message, err.stack);
    res.status(400).json({ error: err.message });
  }
};

exports.updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(`
      UPDATE tasks
      SET status = $1, updated_at = NOW()
      WHERE id = $2 RETURNING *`,
      [status, id]
    );
    
    const updatedTask = result.rows[0];
    
    // Dërgo notification për ndryshimin e statusit
    if (updatedTask && updatedTask.assigned_to) {
      try {
        if (status === 'completed') {
          await NotificationService.notifyUserTaskCompleted(updatedTask.assigned_to, updatedTask.title);
          
          // Dërgo notification për admin kur task përfundon
          await NotificationService.notifyAdminTaskCompleted(updatedTask.title, updatedTask.assigned_to);
          console.log(`[DEBUG] Admin notification sent for task completion: ${updatedTask.title}`);
        } else if (status === 'overdue') {
          await NotificationService.notifyUserTaskOverdue(updatedTask.assigned_to, updatedTask.title);
        }
        console.log(`[DEBUG] Status update notification sent for task ${id}`);
      } catch (notificationError) {
        console.error('[ERROR] Failed to send status update notification:', notificationError);
      }
    }
    
    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
