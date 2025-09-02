const { pool } = require('../db'); // Updated to use new structure
const { sendInvoiceEmail, sendContractDetailsEmail } = require('../services/emailService');
const PDFDocument = require('pdfkit');

// Generate invoice PDF buffer using PDFKit (avoids Chromium download)
async function generateInvoicePDFBuffer(invoice, contract) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatCurrency = (amount) => new Intl.NumberFormat('sq-AL', { style: 'currency', currency: 'GBP' }).format(amount || 0);

  return await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc
      .fillColor('#cc6600')
      .fontSize(22)
      .text(`INVOICE #${invoice.invoice_number}`, { align: 'left' });
    doc
      .moveDown(0.3)
      .fontSize(10)
      .fillColor('#555')
      .text(`Contract #${contract.contract_number} – ${contract.site_name || contract.company}`);

    // Client info
    doc.moveDown().fillColor('#333').fontSize(11);
    doc.text(`Date: ${formatDate(invoice.date)}`);
    doc.text(`Client: ${contract.company}`);
    doc.text(`Project: ${contract.site_name || contract.company}`);

    // Table header
    doc.moveDown().fontSize(11).fillColor('#007bff').text('Items');
    doc.moveDown(0.2).fillColor('#333');
    doc.fontSize(10);
    doc.text('Description', 40, doc.y, { continued: true, width: 250 });
    doc.text('Shifts', 300, doc.y, { continued: true, width: 60, align: 'right' });
    doc.text('Rate', 370, doc.y, { continued: true, width: 80, align: 'right' });
    doc.text('Amount', 450, doc.y, { width: 100, align: 'right' });
    doc.moveTo(40, doc.y + 3).lineTo(555, doc.y + 3).strokeColor('#ddd').stroke();

    // Table rows
    (invoice.items || []).forEach((item) => {
      const y = doc.y + 6;
      doc.fillColor('#333').text(item.description || '', 40, y, { continued: true, width: 250 });
      doc.text(String(item.shifts || ''), 300, y, { continued: true, width: 60, align: 'right' });
      doc.text(formatCurrency(item.rate), 370, y, { continued: true, width: 80, align: 'right' });
      doc.text(formatCurrency(item.amount), 450, y, { width: 100, align: 'right' });
      doc.moveDown(0.6);
    });

    // Totals
    doc.moveDown();
    doc.text(`Subtotal: ${formatCurrency(invoice.total_net)}`, { align: 'right' });
    doc.text(`VAT (20%): ${formatCurrency(invoice.vat)}`, { align: 'right' });
    doc.text(`Other: ${formatCurrency(invoice.other)}`, { align: 'right' });
    doc.fontSize(12).fillColor('#cc6600').text(`Total: ${formatCurrency(invoice.total)}`, { align: 'right' });

    // Bank details
    doc.moveDown().fillColor('#007bff').fontSize(12).text('Capital Rise Ltd');
    doc.fillColor('#333').fontSize(10);
    doc.text('HSBC Bank');
    doc.text('Account Number: 81845403');
    doc.text('Sort Code: 52474549');
    doc.text('Email: billing@capitalrise.al');
    doc.text('Phone: +355 XX XXX XXX');
    doc.text('Website: www.capitalrise.al');

    doc.moveDown().fillColor('#0a8340').fontSize(11).text('THANK YOU FOR YOUR BUSINESS!', { align: 'center' });

    doc.end();
  });
}

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
    
    // Gjenero PDF për faturën (PDFKit)
    let pdfBuffer = null;
    try {
      pdfBuffer = await generateInvoicePDFBuffer(invoice, contract);
    } catch (pdfError) {
      console.error('Gabim në gjenerimin e PDF:', pdfError);
      // Vazhdon pa PDF nëse ka gabim
    }
    
    // Dërgo email-in me PDF attachment
    const result = await sendInvoiceEmail(invoice, contract, contract.company_email, pdfBuffer);
    
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