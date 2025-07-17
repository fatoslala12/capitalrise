const nodemailer = require('nodemailer');
const html2pdf = require('html2pdf.js');

// Konfigurimi i transporter-it për Gmail
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'fatoslala12@gmail.com', // Email-i i loguar
    pass: process.env.GMAIL_APP_PASSWORD // App Password nga Google
  }
});

// Funksion për të gjeneruar PDF nga faturë
const generateInvoicePDF = async (invoice, contract) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Fatura ${invoice.invoice_number}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { max-width: 150px; }
        .invoice-details { margin-bottom: 20px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .total { text-align: right; font-weight: bold; font-size: 18px; margin-top: 20px; }
        .footer { margin-top: 40px; text-align: center; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🧾 FATURË</h1>
        <p>Kontrata #${contract.contract_number} – ${contract.site_name}</p>
      </div>
      
      <div class="invoice-details">
        <p><strong>Data:</strong> ${invoice.date}</p>
        <p><strong>Kompania:</strong> ${contract.company}</p>
        <p><strong>Adresa:</strong> ${contract.address || 'N/A'}</p>
        <p><strong>Përshkrimi:</strong> ${invoice.description || 'N/A'}</p>
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Përshkrimi</th>
            <th>Shifts</th>
            <th>Rate</th>
            <th>Shuma</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items ? invoice.items.map(item => `
            <tr>
              <td>${item.description || ''}</td>
              <td>${item.shifts || ''}</td>
              <td>£${item.rate || '0.00'}</td>
              <td>£${item.amount ? item.amount.toFixed(2) : '0.00'}</td>
            </tr>
          `).join('') : ''}
        </tbody>
      </table>
      
      <div class="total">
        <p>Të tjera: £${invoice.other || '0.00'}</p>
        <p>TVSH (20%): £${invoice.vat || '0.00'}</p>
        <p><strong>TOTALI: £${invoice.total || '0.00'}</strong></p>
      </div>
      
      <div class="footer">
        <p>Falënderojmë për besimin tuaj!</p>
        <p>Alban Construction</p>
      </div>
    </body>
    </html>
  `;

  try {
    const pdfBuffer = await html2pdf().from(htmlContent).outputPdf('datauristring');
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Funksion kryesor për dërgimin e email-it
const sendInvoiceEmail = async (invoice, contract, recipientEmail) => {
  try {
    // Gjenero PDF
    const pdfBuffer = await generateInvoicePDF(invoice, contract);
    
    // Përgatit email-in
    const mailOptions = {
      from: 'fatoslala12@gmail.com',
      to: recipientEmail,
      subject: `Fatura #${invoice.invoice_number} - ${contract.site_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">🧾 FATURË</h1>
            <p style="color: #666;">Kontrata #${contract.contract_number} – ${contract.site_name}</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0;">Detajet e Faturës</h3>
            <p><strong>Numri i Faturës:</strong> ${invoice.invoice_number}</p>
            <p><strong>Data:</strong> ${invoice.date}</p>
            <p><strong>Kompania:</strong> ${contract.company}</p>
            <p><strong>Përshkrimi:</strong> ${invoice.description || 'N/A'}</p>
            <p><strong>Totali:</strong> £${invoice.total || '0.00'}</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666;">Fatura është bashkëngjitur në këtë email.</p>
            <p style="color: #666;">Falënderojmë për besimin tuaj!</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Fatura_${invoice.invoice_number}_${contract.site_name}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    // Dërgo email-in
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = {
  sendInvoiceEmail
}; 