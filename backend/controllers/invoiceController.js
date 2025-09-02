const { pool } = require('../db'); // Updated to use new structure
const { sendInvoiceEmail, sendContractDetailsEmail } = require('../services/emailService');
const puppeteer = require('puppeteer');

// Funksion për të gjeneruar HTML për PDF
function generateInvoicePDFHTML(invoice, contract) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sq-AL', { 
      style: 'currency', 
      currency: 'GBP' 
    }).format(amount || 0);
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Invoice #${invoice.invoice_number}</title>
      <style>
        body {
          font-family: 'Segoe UI', sans-serif;
          font-size: 14px;
          margin: 0;
          padding: 20px;
          color: #333;
          background: white;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #cc6600;
          padding-bottom: 20px;
        }
        .title-block h1 {
          color: #cc6600;
          font-size: 24px;
          margin: 0;
        }
        .subtitle {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }
        .company-info {
          text-align: right;
        }
        .company-info div {
          margin: 2px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th {
          background: #d4f2dd;
          color: #333;
          padding: 8px;
          border: 1px solid #c0e6ca;
          text-align: left;
          font-size: 12px;
        }
        td {
          padding: 8px;
          border: 1px solid #eee;
          font-size: 12px;
        }
        .totals {
          margin-top: 20px;
          display: flex;
          justify-content: flex-end;
        }
        .totals-table {
          width: 250px;
          border-collapse: collapse;
        }
        .totals-table td {
          padding: 6px;
          text-align: right;
        }
        .totals-table .label {
          text-align: left;
          color: #333;
        }
        .totals-table .grand-total {
          font-size: 14px;
          font-weight: bold;
          color: #cc6600;
        }
        .bank-details {
          margin-top: 30px;
          color: #333;
        }
        .bank-details h3 {
          color: #cc6600;
          margin-bottom: 8px;
          font-size: 16px;
        }
        .bank-details div {
          margin: 2px 0;
          font-size: 12px;
        }
        .thank-you {
          margin-top: 30px;
          text-align: center;
          font-weight: bold;
          color: #0a8340;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title-block">
          <h1>INVOICE #${invoice.invoice_number}</h1>
          <div class="subtitle">Contract #${contract.contract_number} – ${contract.site_name || contract.company}</div>
        </div>
        <div class="company-info">
          <div><strong>Date:</strong> ${formatDate(invoice.date)}</div>
          <div><strong>Client:</strong> ${contract.company}</div>
          <div><em>${contract.site_name || contract.company}</em></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Shifts</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${(invoice.items || []).map(item => `
            <tr>
              <td>${item.description || ''}</td>
              <td>${item.shifts || ''}</td>
              <td>${formatCurrency(item.rate)}</td>
              <td>${formatCurrency(item.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <table class="totals-table">
          <tr>
            <td class="label">Subtotal:</td>
            <td>${formatCurrency(invoice.total_net)}</td>
          </tr>
          <tr>
            <td class="label">VAT (20%):</td>
            <td>${formatCurrency(invoice.vat)}</td>
          </tr>
          <tr>
            <td class="label">Other:</td>
            <td>${formatCurrency(invoice.other)}</td>
          </tr>
          <tr>
            <td class="label grand-total">Total:</td>
            <td class="grand-total">${formatCurrency(invoice.total)}</td>
          </tr>
        </table>
      </div>

      <div class="bank-details">
        <h3>Capital Rise Ltd</h3>
        <div>HSBC Bank</div>
        <div>Account Number: 81845403</div>
        <div>Sort Code: 52474549</div>
        <div>Email: billing@capitalrise.al</div>
        <div>Phone: +355 XX XXX XXX</div>
        <div>Website: www.capitalrise.al</div>
      </div>

      <div class="thank-you">
        THANK YOU FOR YOUR BUSINESS!
      </div>
    </body>
    </html>
  `;
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
    
    // Gjenero PDF për faturën
    let pdfBuffer = null;
    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      // Krijon HTML për PDF
      const htmlContent = generateInvoicePDFHTML(invoice, contract);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Gjeneron PDF
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });
      
      await browser.close();
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