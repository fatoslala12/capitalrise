const pool = require('../db');

exports.getInvoicesByContract = async (req, res) => {
  const { contract_number } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM invoices WHERE contract_number = $1::text ORDER BY date DESC',
      [contract_number]
    );
    console.log('[DEBUG] /api/invoices/contract/:contract_number - rows:', result.rows.length);
    result.rows.forEach((row, idx) => {
      console.log(`[DEBUG] Invoice Row ${idx}:`, row);
    });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addInvoice = async (req, res) => {
  const {
    contract_number,
    invoice_number,
    date,
    description,
    shifts,
    rate,
    total,
    total_net,
    vat,
    other,
    created_by,
    paid,
    actions,
    items,
    status,
    notes
  } = req.body;

  console.log('INVOICE PAYLOAD:', req.body);

  try {
    const result = await pool.query(
      `INSERT INTO invoices
        (contract_number, invoice_number, date, description, shifts, rate, total, total_net, vat, other, created_by, paid, actions, items, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        contract_number,
        invoice_number,
        date,
        description,
        shifts,
        rate,
        total,
        total_net,
        vat,
        other,
        created_by,
        paid,
        JSON.stringify(actions),
        JSON.stringify(items),
        status,
        notes
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('INVOICE ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.togglePaid = async (req, res) => {
  const { id } = req.params;
  const { paid } = req.body;
  try {
    const result = await pool.query(
      'UPDATE invoices SET paid = $1 WHERE id = $2 RETURNING *',
      [paid, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteInvoice = async (req, res) => {
  const { id } = req.params;
  console.log("Po fshihet fatura me id:", id);
  try {
    const result = await pool.query('DELETE FROM invoices WHERE id = $1', [id]);
    console.log("Rows affected:", result.rowCount);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("Gabim gjatë fshirjes së faturës:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllInvoices = async (req, res) => {
  try {
    console.log('[DEBUG] /api/invoices called');
    let result = { rows: [] };
    try {
      result = await pool.query('SELECT * FROM invoices ORDER BY date DESC');
      console.log('[DEBUG] /api/invoices - rows:', result.rows.length);
      if (result.rows.length > 0) {
        console.log('[DEBUG] Invoice Row 0:', result.rows[0]);
      }
    } catch (err) {
      console.error('[ERROR] /api/invoices main query:', err.message);
      return res.json([]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error('[ERROR] /api/invoices (outer catch):', err.message);
    res.status(500).json({ error: err.message });
  }
};