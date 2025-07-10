const pool = require('../db');

exports.getAllPayments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, e.first_name, e.last_name, c.site_name
      FROM payments p
      JOIN employees e ON p.employee_id = e.id
      JOIN contracts c ON p.contract_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPaymentsByEmployee = async (req, res) => {
  const { employeeId } = req.params;
  try {
    const result = await pool.query(`
      SELECT * FROM payments
      WHERE employee_id = $1 ORDER BY created_at DESC`,
      [employeeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addPayment = async (req, res) => {
  const { employee_id, contract_id, week_label, is_paid, gross_amount, net_amount } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO payments
      (employee_id, contract_id, week_label, is_paid, gross_amount, net_amount)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [employee_id, contract_id, week_label, is_paid, gross_amount, net_amount]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updatePayment = async (req, res) => {
  const { id } = req.params;
  const { is_paid, gross_amount, net_amount } = req.body;
  try {
    const result = await pool.query(`
      UPDATE payments
      SET is_paid = $1, gross_amount = $2, net_amount = $3, updated_at = NOW()
      WHERE id = $4 RETURNING *`,
      [is_paid, gross_amount, net_amount, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deletePayment = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM payments WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
