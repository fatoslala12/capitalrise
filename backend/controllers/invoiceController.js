const { pool } = require('../db'); // Updated to use new structure
const { sendInvoiceEmail, sendContractDetailsEmail } = require('../services/emailService');

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

// Dërgo faturë në email
exports.sendInvoiceEmail = async (req, res) => {
  const { invoiceId } = req.params;
  
  try {
    // Merr faturën
    const invoiceResult = await pool.query(
      'SELECT * FROM invoices WHERE id = $1',
      [invoiceId]
    );
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Fatura nuk u gjet' });
    }
    
    const invoice = invoiceResult.rows[0];
    
    // Merr kontratën
    const contractResult = await pool.query(
      'SELECT * FROM contracts WHERE contract_number = $1',
      [invoice.contract_number]
    );
    
    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kontrata nuk u gjet' });
    }
    
    const contract = contractResult.rows[0];
    
    // Kontrollo nëse ka email të kompanisë
    if (!contract.company_email) {
      return res.status(400).json({ 
        error: 'Kompania nuk ka email të konfiguruar. Ju lutem shtoni email-in e kompanisë në detajet e kontratës.' 
      });
    }
    
    // Dërgo email-in
    const result = await sendInvoiceEmail(invoice, contract, contract.company_email);
    
    // Përditëso faturën për të shënuar që është dërguar me email
    await pool.query(
      'UPDATE invoices SET emailed = TRUE, emailed_at = CURRENT_TIMESTAMP WHERE id = $1',
      [invoiceId]
    );
    
    res.json({ 
      success: true, 
      message: 'Fatura u dërgua me sukses në email!',
      messageId: result.messageId,
      emailed: true,
      emailed_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error sending invoice email:', error);
    res.status(500).json({ 
      error: 'Gabim gjatë dërgimit të email-it',
      details: error.message 
    });
  }
};

// Dërgo contract details në email
exports.sendContractDetailsEmail = async (req, res) => {
  const { contract_number } = req.params;
  
  try {
    // Merr kontratën
    const contractResult = await pool.query(
      'SELECT * FROM contracts WHERE contract_number = $1',
      [contract_number]
    );
    
    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kontrata nuk u gjet' });
    }
    
    const contract = contractResult.rows[0];
    
    // Kontrollo nëse ka email të kompanisë
    if (!contract.company_email) {
      return res.status(400).json({ 
        error: 'Kompania nuk ka email të konfiguruar. Ju lutem shtoni email-in e kompanisë në detajet e kontratës.' 
      });
    }
    
    // Dërgo email-in
    const result = await sendContractDetailsEmail(contract, contract.company_email);
    
    res.json({ 
      success: true, 
      message: 'Detajet e kontratës u dërguan me sukses në email!',
      messageId: result.messageId 
    });
    
  } catch (error) {
    console.error('Error sending contract details email:', error);
    res.status(500).json({ 
      error: 'Gabim gjatë dërgimit të email-it',
      details: error.message 
    });
  }
};