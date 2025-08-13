const { pool } = require('../db'); // Updated to use new structure

exports.getAllRelations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ew.id, ew.employee_id, e.first_name, e.last_name,
             ew.contract_id, c.contract_number, c.site_name
      FROM employee_workplaces ew
      JOIN employees e ON ew.employee_id = e.id
      JOIN contracts c ON ew.contract_id = c.id
      ORDER BY ew.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.assignEmployeeToContract = async (req, res) => {
  const { employee_id, contract_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO employee_workplaces (employee_id, contract_id)
       VALUES ($1, $2) RETURNING *`,
      [employee_id, contract_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.removeRelation = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM employee_workplaces WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
