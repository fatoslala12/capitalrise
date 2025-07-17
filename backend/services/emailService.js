const { Resend } = require('resend');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

// Inicializo Resend me API key
const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');

// Funksion për të gjeneruar PDF nga faturë me pdf-lib
const generateInvoicePDF = async (invoice, contract) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let y = 800;
  const drawText = (text, size = 14, color = rgb(0,0,0), x = 50) => {
    page.drawText(text, { x, y, size, font, color });
    y -= size + 8;
  };

  drawText(`FATURA`, 22, rgb(0.2,0.2,0.7));
  drawText(`Kontrata #${contract.contract_number} – ${contract.site_name}`, 14);
  drawText(`Data: ${invoice.date}`);
  drawText(`Kompania: ${contract.company}`);
  drawText(`Adresa: ${contract.address || 'N/A'}`);
  drawText(`Pershkrimi: ${invoice.description || 'N/A'}`);
  y -= 10;
  drawText('---------------------------------------------', 10);
  drawText('Pershkrimi   Shifts   Rate   Shuma', 12, rgb(0.1,0.1,0.1));
  (invoice.items || []).forEach(item => {
    drawText(`${item.description || ''}   ${item.shifts || ''}   £${item.rate || '0.00'}   £${item.amount ? item.amount.toFixed(2) : '0.00'}`, 12);
  });
  y -= 10;
  drawText('---------------------------------------------', 10);
  drawText(`Te tjera: £${invoice.other || '0.00'}`);
  drawText(`TVSH (20%): £${invoice.vat || '0.00'}`);
  drawText(`TOTALI: £${invoice.total || '0.00'}`, 16, rgb(0,0.5,0));
  y -= 20;
  drawText('Faleminderit per besimin tuaj!', 12, rgb(0.2,0.5,0.2));
  drawText('Alban Construction', 12, rgb(0.2,0.5,0.2));

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

// Funksion kryesor për dërgimin e email-it
const sendInvoiceEmail = async (invoice, contract, recipientEmail) => {
  try {
    // Gjenero PDF
    const pdfBuffer = await generateInvoicePDF(invoice, contract);
    
    // Konverto PDF buffer në base64
    const pdfBase64 = pdfBuffer.toString('base64');
    
    // Përgatit email-in me Resend
    const { data, error } = await resend.emails.send({
      from: 'Alban Construction <onboarding@resend.dev>',
      to: [recipientEmail],
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
          content: pdfBase64
        }
      ]
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(`Email sending failed: ${error.message}`);
    }

    console.log('Email sent successfully:', data?.id);
    return { success: true, messageId: data?.id };
    
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Funksion për dërgimin e contract details në email
const sendContractDetailsEmail = async (contract, recipientEmail) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Alban Construction <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `Detajet e Kontratës #${contract.contract_number} - ${contract.site_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">📋 DETAJET E KONTRATËS</h1>
            <p style="color: #666;">Kontrata #${contract.contract_number}</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0;">Informacioni i Kontratës</h3>
            <p><strong>Emri i Kompanisë:</strong> ${contract.company}</p>
            <p><strong>Vendodhja:</strong> ${contract.site_name}</p>
            <p><strong>Vlera e Kontratës:</strong> £${contract.contract_value || '0.00'}</p>
            <p><strong>Data e Fillimit:</strong> ${contract.start_date || 'N/A'}</p>
            <p><strong>Data e Mbarimit:</strong> ${contract.end_date || 'N/A'}</p>
            <p><strong>Statusi:</strong> ${contract.status || 'N/A'}</p>
            <p><strong>Adresa:</strong> ${contract.address || 'N/A'}</p>
            <p><strong>Përshkrimi:</strong> ${contract.description || 'N/A'}</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666;">Faleminderit për bashkëpunimin!</p>
            <p style="color: #666;">Alban Construction Ltd</p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(`Email sending failed: ${error.message}`);
    }

    console.log('Contract details email sent successfully:', data?.id);
    return { success: true, messageId: data?.id };
    
  } catch (error) {
    console.error('Error sending contract details email:', error);
    throw error;
  }
};

module.exports = {
  sendInvoiceEmail,
  sendContractDetailsEmail
}; 