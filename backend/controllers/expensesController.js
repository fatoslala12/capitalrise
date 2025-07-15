const pool = require('../db');

exports.getAllExpenses = async (req, res) => {
  try {
    console.log('[DEBUG] /api/expenses called');
    let result = { rows: [] };
    try {
      result = await pool.query('SELECT * FROM expenses_invoices ORDER BY date DESC');
      console.log('[DEBUG] /api/expenses - rows:', result.rows.length);
      if (result.rows.length > 0) {
        console.log('[DEBUG] Expense Row 0:', result.rows[0]);
      }
    } catch (err) {
      console.error('[ERROR] /api/expenses main query:', err.message);
      return res.json([]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error('[ERROR] /api/expenses (outer catch):', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getExpensesByContract = async (req, res) => {
  const { contract_number } = req.params;
  console.log('[DEBUG] getExpensesByContract called with contract_number:', contract_number);
  
  try {
    const contractRes = await pool.query(
      'SELECT id FROM contracts WHERE contract_number = $1',
      [contract_number]
    );
    console.log('[DEBUG] Contract query result:', contractRes.rows);
    
    if (contractRes.rows.length === 0) {
      console.log('[DEBUG] No contract found for contract_number:', contract_number);
      return res.json([]);
    }
    
    const contract_id = contractRes.rows[0].id;
    console.log('[DEBUG] Found contract_id:', contract_id);
    
    const result = await pool.query(
      'SELECT * FROM expenses_invoices WHERE contract_id = $1 ORDER BY date DESC',
      [contract_id]
    );
    console.log('[DEBUG] Expenses query result:', result.rows);
    console.log('[DEBUG] Number of expenses found:', result.rows.length);
    
    res.json(result.rows);
  } catch (err) {
    console.error('[ERROR] getExpensesByContract error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.addExpense = async (req, res) => {
  const { contract_id, expense_type, date, gross, net, tax, paid } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO expenses_invoices
      (contract_id, expense_type, date, gross, net, tax, paid)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [contract_id, expense_type, date, gross, net, tax, paid]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateExpense = async (req, res) => {
  const { id } = req.params;
  const { gross, net, tax, paid } = req.body;
  try {
    const result = await pool.query(`
      UPDATE expenses_invoices
      SET gross = $1, net = $2, tax = $3, paid = $4, updated_at = NOW()
      WHERE id = $5 RETURNING *`,
      [gross, net, tax, paid, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteExpense = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM expenses_invoices WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addExpenseForContract = async (req, res) => {
  const { contract_number } = req.params;
  const fields = req.body;
  console.log('[DEBUG] addExpenseForContract called with contract_number:', contract_number);
  console.log('[DEBUG] Fields received:', fields);
  
  try {
    const contractRes = await pool.query(
      'SELECT id FROM contracts WHERE contract_number = $1',
      [contract_number]
    );
    console.log('[DEBUG] Contract query result:', contractRes.rows);
    
    if (contractRes.rows.length === 0) {
      console.log('[DEBUG] No contract found for contract_number:', contract_number);
      return res.status(400).json({ error: 'Kontrata nuk u gjet' });
    }
    
    const contract_id = contractRes.rows[0].id;
    console.log('[DEBUG] Found contract_id:', contract_id);
    
    const result = await pool.query(
      `INSERT INTO expenses_invoices (contract_id, expense_type, date, gross, net, tax, paid, receipt_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [contract_id, fields.expense_type, fields.date, fields.gross, fields.net, fields.tax, fields.paid, fields.receipt_path || null]
    );
    console.log('[DEBUG] Insert result:', result.rows[0]);
    
    const all = await pool.query(
      'SELECT * FROM expenses_invoices WHERE contract_id = $1 ORDER BY date DESC',
      [contract_id]
    );
    console.log('[DEBUG] All expenses for contract:', all.rows);
    console.log('[DEBUG] Total expenses found:', all.rows.length);
    
    res.json(all.rows);
  } catch (err) {
    console.error('[ERROR] addExpenseForContract error:', err);
    res.status(400).json({ error: err.message });
  }
};

exports.togglePaidStatus = async (req, res) => {
  const { id } = req.params;
  try {
    // Merr statusin aktual
    const current = await pool.query(
      'SELECT paid, contract_id FROM expenses_invoices WHERE id = $1',
      [id]
    );
    if (current.rows.length === 0) return res.status(404).json({ error: 'Shpenzimi nuk u gjet' });
    const newPaid = !current.rows[0].paid;
    const contract_id = current.rows[0].contract_id;
    await pool.query(
      'UPDATE expenses_invoices SET paid = $1 WHERE id = $2',
      [newPaid, id]
    );
    // Kthe të gjithë faturat për këtë kontratë
    const all = await pool.query(
      'SELECT * FROM expenses_invoices WHERE contract_id = $1',
      [contract_id]
    );
    res.json(all.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
