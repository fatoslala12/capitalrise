const pool = require('../db');

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
  const { assigned_to, title, description, status, site_name, due_date, assigned_by } = req.body;
  console.log('[DEBUG] addTask payload:', req.body);
  try {
    const result = await pool.query(`
      INSERT INTO tasks (assigned_to, title, description, status, site_name, due_date, assigned_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [assigned_to, title, description, status, site_name, due_date, assigned_by]
    );
    res.status(201).json(result.rows[0]);
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
    res.json(result.rows[0]);
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
