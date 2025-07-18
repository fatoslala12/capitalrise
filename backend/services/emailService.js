const { Resend } = require('resend');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const NotificationService = require('./notificationService');

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
      subject: `Faturë për Punimet e Kryera – ${contract.site_name} – Kontrata #${contract.contract_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
          <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 24px;">🏗️ Alban Construction</h1>
            </div>
            
            <div style="margin-bottom: 20px;">
              <p style="color: #475569; font-size: 16px; margin: 0;">Përshëndetje,</p>
              <p style="color: #475569; font-size: 16px; margin: 10px 0 0 0;">
                Ju dërgojmë më poshtë detajet e faturës të lëshuar për punimet e kryera në kuadër të kontratës #${contract.contract_number} – ${contract.site_name}:
              </p>
            </div>
            
            <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
              <div style="text-align: center; margin-bottom: 15px;">
                <span style="font-size: 24px;">🧾</span>
                <h3 style="margin: 10px 0 0 0; color: #1e293b;">Detajet e Faturës:</h3>
              </div>
              <div style="background-color: white; padding: 15px; border-radius: 5px;">
                <p style="margin: 0 0 8px 0; color: #475569;"><strong>• Numri i Faturës:</strong> ${invoice.invoice_number}</p>
                <p style="margin: 0 0 8px 0; color: #475569;"><strong>• Data e Lëshimit:</strong> ${invoice.date}</p>
                <p style="margin: 0 0 8px 0; color: #475569;"><strong>• Kompania:</strong> ${contract.company}</p>
                <p style="margin: 0 0 8px 0; color: #475569;"><strong>• Përshkrimi i Punimeve:</strong> ${invoice.description || 'N/A'}</p>
                <p style="margin: 0; color: #475569;"><strong>• Shuma Totale:</strong> £${invoice.total || '0.00'}</p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; margin: 0 0 10px 0; font-size: 14px;">📎 Fatura është bashkëngjitur në këtë email.</p>
              <p style="color: #64748b; margin: 0; font-size: 14px;">
                Faleminderit për bashkëpunimin dhe besimin tuaj të vazhdueshëm.
              </p>
              <p style="color: #64748b; margin: 10px 0 0 0; font-size: 14px;">
                Me respekt,<br>
                Alban Construction Ltd
              </p>
            </div>
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
    
    // Dërgo njoftim për admin
    await NotificationService.notifyAdminEmailSent(invoice.id, contract.id, 'invoice');
    
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
      subject: `Informacion mbi Kontratën #${contract.contract_number} – ${contract.site_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
          <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 24px;">🏗️ Alban Construction</h1>
            </div>
            
            <div style="margin-bottom: 20px;">
              <p style="color: #475569; font-size: 16px; margin: 0;">Përshëndetje,</p>
              <p style="color: #475569; font-size: 16px; margin: 10px 0 0 0;">
                Ju informojmë se është lidhur me sukses kontrata e re me detajet si më poshtë:
              </p>
            </div>
            
            <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
              <div style="text-align: center; margin-bottom: 15px;">
                <span style="font-size: 24px;">🧾</span>
                <h3 style="margin: 10px 0 0 0; color: #1e293b;">Informacion mbi Kontratën:</h3>
              </div>
              <div style="background-color: white; padding: 15px; border-radius: 5px;">
                <p style="margin: 0 0 8px 0; color: #475569;"><strong>• Numri i Kontratës:</strong> #${contract.contract_number}</p>
                <p style="margin: 0 0 8px 0; color: #475569;"><strong>• Emri i Kompanisë:</strong> ${contract.company}</p>
                <p style="margin: 0 0 8px 0; color: #475569;"><strong>• Vendodhja e Punimeve:</strong> ${contract.site_name}</p>
                <p style="margin: 0 0 8px 0; color: #475569;"><strong>• Vlera Totale e Kontratës:</strong> £${contract.contract_value || '0.00'}</p>
                <p style="margin: 0 0 8px 0; color: #475569;"><strong>• Data e Fillimit:</strong> ${contract.start_date || 'N/A'}</p>
                <p style="margin: 0 0 8px 0; color: #475569;"><strong>• Data e Mbarimit:</strong> ${contract.finish_date || 'N/A'}</p>
                <p style="margin: 0 0 8px 0; color: #475569;"><strong>• Statusi Aktual:</strong> ${contract.status || 'N/A'}</p>
                <p style="margin: 0 0 8px 0; color: #475569;"><strong>• Adresa:</strong> ${contract.address || 'N/A'}</p>
                <p style="margin: 0; color: #475569;"><strong>• Përshkrim i Punimeve:</strong> ${contract.description || 'N/A'}</p>
              </div>
            </div>
            
            <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="color: #0c4a6e; margin: 0; font-size: 14px; line-height: 1.6;">
                Kjo kontratë shënon një tjetër hap të rëndësishëm në ndërtimin e marrëdhënieve të qëndrueshme dhe profesionale midis palëve.
              </p>
            </div>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.6;">
                Ne mbetemi të angazhuar për realizimin e suksesshëm të projektit, duke ofruar cilësi të lartë, respektim të afateve, dhe bashkëpunim të hapur në çdo fazë të zbatimit.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; margin: 0; font-size: 14px;">
                Faleminderit për besimin dhe bashkëpunimin tuaj të çmuar.
              </p>
              <p style="color: #64748b; margin: 10px 0 0 0; font-size: 14px;">
                Me respekt,<br>
                Alban Construction Ltd
              </p>
            </div>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(`Email sending failed: ${error.message}`);
    }

    console.log('Contract details email sent successfully:', data?.id);
    
    // Dërgo njoftim për admin
    await NotificationService.notifyAdminEmailSent(null, contract.id, 'contract');
    
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