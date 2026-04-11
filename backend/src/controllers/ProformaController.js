const db = require('../config/db');
const { sendMail } = require('../utils/mailer');
const { buildProformaHtml } = require('../utils/proformaGenerator');
const { generatePdf } = require('../utils/pdfGenerator');

const ProformaController = {
  /**
   * @desc    Create a new proforma invoice
   * @route   POST /api/admin/proforma
   */
  create: async (req, res) => {
    try {
      const { 
        client_name, 
        client_address,
        client_email,
        items, 
        subtotal, 
        vat_percentage, 
        vat_amount, 
        grand_total,
        warranty,
        delivery_terms,
        payment_terms,
        validity_days
      } = req.body;
      
      const created_by = req.user.id;
      
      // Generate a unique invoice number (Expert Office Standard: PI-DATE-RANDOM)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.floor(1000 + Math.random() * 9000);
      const invoice_number = `PI-${dateStr}-${random}`;

      const [result] = await db.query(
        `INSERT INTO proforma_invoices (
          invoice_number, client_name, client_address, client_email, items, 
          subtotal, vat_percentage, vat_amount, grand_total,
          warranty, delivery_terms, payment_terms, validity_days, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoice_number, client_name, client_address, client_email, JSON.stringify(items),
          subtotal, vat_percentage, vat_amount, grand_total,
          warranty, delivery_terms, payment_terms, validity_days, created_by
        ]
      );

      // Log activity
      await db.query(
          'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
          [req.user.id, 'CREATE_PROFORMA', `Generated Proforma Invoice: ${invoice_number} for ${client_name}`]
      );

      res.status(201).json({ 
        message: 'Proforma invoice created successfully', 
        invoice_number,
        id: result.insertId 
      });
    } catch (error) {
      console.error('CREATE_PROFORMA_ERROR:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  /**
   * @desc    Get all proforma invoices
   * @route   GET /api/admin/proforma
   */
  getAll: async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT p.*, u.full_name as creator_name, u.signature as creator_signature 
         FROM proforma_invoices p
         LEFT JOIN users u ON p.created_by = u.id
         ORDER BY p.created_at DESC`
      );
      res.json(rows);
    } catch (error) {
      console.error('GET_PROFORMA_ERROR:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  /**
   * @desc    Delete a proforma invoice
   * @route   DELETE /api/admin/proforma/:id
   */
  delete: async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM proforma_invoices WHERE id = ?', [id]);
        res.json({ message: 'Proforma invoice removed from archives' });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  /**
   * @desc    Send proforma by email
   * @route   POST /api/admin/proforma/:id/send
   */
  sendByEmail: async (req, res) => {
    try {
      const { id } = req.params;
      
      const [rows] = await db.query(
        `SELECT p.*, u.full_name as creator_name, u.signature as creator_signature 
         FROM proforma_invoices p
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.id = ?`, 
        [id]
      );
      
      if (rows.length === 0) return res.status(404).json({ error: 'Proforma not found' });
      const proforma = rows[0];
      
      const email = proforma.client_email;
      if (!email) {
        return res.status(400).json({ error: 'Client email is required to send' });
      }

      // 1. Build PDF using the new proformaGenerator
      const items = typeof proforma.items === 'string' ? JSON.parse(proforma.items || '[]') : (proforma.items || []);
      const htmlContent = buildProformaHtml(proforma, items, {});
      const pdfBuffer = await generatePdf(htmlContent);

      // 2. Prepare Email Body (Mirroring Receipt style)
      const emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; max-width: 600px;">
          <div style="background-color: #16a34a; padding: 30px; border-radius: 15px 15px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Proforma Invoice</h1>
          </div>
          <div style="padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 15px 15px;">
            <h2 style="color: #16a34a; margin-top: 0;">Hello ${proforma.client_name},</h2>
            <p>Thank you for choosing <strong>Expert Office Furnish</strong>. We are pleased to provide you with the requested quotation.</p>
            <p>Please find your official <strong>Proforma Invoice</strong> attached to this email for reference number <strong>${proforma.invoice_number}</strong>.</p>
            
            <div style="background-color: #f9f9f9; padding: 25px; border-radius: 10px; margin: 25px 0; border: 1px solid #eee;">
              <p style="margin: 0; font-size: 14px; color: #666;">Document Details</p>
              <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                <p style="margin: 0;"><strong>Invoice Number:</strong></p>
                <p style="margin: 0;">${proforma.invoice_number}</p>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                <p style="margin: 0;"><strong>Date:</strong></p>
                <p style="margin: 0;">${new Date(proforma.created_at).toLocaleDateString()}</p>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                <p style="margin: 0;"><strong>Total Amount:</strong></p>
                <p style="margin: 0; color: #16a34a; font-weight: bold;">GH₵ ${parseFloat(proforma.grand_total).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <p>This proforma invoice is valid for <strong>${proforma.validity_days}</strong>. Should you wish to proceed with the order or have any questions, please don't hesitate to reply to this email or contact our representative, <strong>${proforma.creator_name}</strong>.</p>
            
            <p>Best regards,<br><strong>The Expert Office Team</strong></p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
            <p style="font-size: 12px; color: #999; text-align: center;">Transforming spaces, Inspiring productivity. — Expert Office Furnish</p>
          </div>
        </div>
      `;

      // 3. Send the email
      await sendMail({
        to: email,
        subject: `[Expert Office Furnish] Proforma Invoice — ${proforma.invoice_number}`,
        html: emailHtml,
        attachments: [
          {
            filename: `Proforma_${proforma.invoice_number}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });

      res.json({ message: 'Proforma sent successfully with premium attachment' });
    } catch (error) {
      console.error('SEND_PROFORMA_ERROR:', error);
      res.status(500).json({ error: 'Failed to complete sequence', details: error.message });
    }
  },

  /**
   * @desc    Download proforma PDF
   * @route   GET /api/admin/proforma/:id/download
   */
  downloadPdf: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query(
        `SELECT p.*, u.full_name as creator_name, u.signature as creator_signature 
         FROM proforma_invoices p
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.id = ?`, 
        [id]
      );
      
      if (rows.length === 0) return res.status(404).json({ error: 'Proforma not found' });
      const proforma = rows[0];

      const items = typeof proforma.items === 'string' ? JSON.parse(proforma.items || '[]') : (proforma.items || []);
      const htmlContent = buildProformaHtml(proforma, items, {});
      const pdfBuffer = await generatePdf(htmlContent);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Proforma_${proforma.invoice_number}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('DOWNLOAD_PROFORMA_ERROR:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  },

  /**
   * @desc    Update an existing proforma
   * @route   PUT /api/admin/proforma/:id
   */
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        client_name, 
        client_address,
        client_email,
        items, 
        subtotal, 
        vat_percentage, 
        vat_amount, 
        grand_total,
        warranty,
        delivery_terms,
        payment_terms,
        validity_days
      } = req.body;

      await db.query(
        `UPDATE proforma_invoices SET 
          client_name = ?, client_address = ?, client_email = ?, items = ?, 
          subtotal = ?, vat_percentage = ?, vat_amount = ?, grand_total = ?,
          warranty = ?, delivery_terms = ?, payment_terms = ?, validity_days = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          client_name, client_address, client_email, JSON.stringify(items),
          subtotal, vat_percentage, vat_amount, grand_total,
          warranty, delivery_terms, payment_terms, validity_days,
          id
        ]
      );

      // Log activity
      await db.query(
          'INSERT INTO activity_logs (user_id, action, context) VALUES (?, ?, ?)',
          [req.user.id, 'UPDATE_PROFORMA', `Updated Proforma Invoice ID: ${id} for ${client_name}`]
      );

      res.json({ message: 'Proforma invoice updated successfully' });
    } catch (error) {
      console.error('UPDATE_PROFORMA_ERROR:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  }
};

module.exports = ProformaController;
