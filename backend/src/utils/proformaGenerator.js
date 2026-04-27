const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`;

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // For server-side rendering in Puppeteer, we need to ensure the URL is accessible.
  // We use the BASE_URL from the environment.
  return `${BASE_URL}${cleanPath}`;
};

const getImageUrlBase64 = (imgPath) => {
  if (!imgPath) return '';
  if (imgPath.startsWith('http')) return imgPath;
  try {
     const clean = imgPath.startsWith('/') ? imgPath.slice(1) : imgPath;
     const absolutePath = path.join(__dirname, '..', '..', clean);
     if (fs.existsSync(absolutePath)) {
         const ext = path.extname(absolutePath).slice(1) || 'png';
         const buffer = fs.readFileSync(absolutePath);
         return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${buffer.toString('base64')}`;
     }
  } catch (err) {}
  return getImageUrl(imgPath); // fallback to network url if local not found
};

// Path to the logo file
const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'Company logo.png');
let LOGO_BASE64 = '';

try {
  if (fs.existsSync(LOGO_PATH)) {
    const logoBuffer = fs.readFileSync(LOGO_PATH);
    const logoExt = path.extname(LOGO_PATH).slice(1);
    LOGO_BASE64 = `data:image/${logoExt};base64,${logoBuffer.toString('base64')}`;
  }
} catch (err) {
  console.error('Error loading logo for proforma:', err.message);
}

const buildProformaHtml = (invoice, items, cfg) => {
  const fmt = (n) => parseFloat(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 });
  
  // Load Signature if exists
  const ASSETS_BASE = process.env.ASSETS_DIR || path.join(__dirname, '../../assets');
  let sigBase64 = '';
  if (invoice.creator_signature) {
    try {
        const relPath = invoice.creator_signature.replace(/^\//, '').replace(/^assets\//, '');
        const sigPath = path.join(ASSETS_BASE, relPath);
        if (fs.existsSync(sigPath)) {
            const sigBuffer = fs.readFileSync(sigPath);
            const sigExt = path.extname(sigPath).slice(1) || 'png';
            sigBase64 = `data:image/${sigExt === 'jpg' ? 'jpeg' : sigExt};base64,${sigBuffer.toString('base64')}`;
        }
    } catch (err) {
        console.error('Error loading signature for proforma:', err.message);
    }
  }

  const rows = items.map(i => `
    <tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:10px 4px; text-align: center;">
        <img src="${getImageUrlBase64(i.image)}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px; background: #f9f9f9;" onerror="this.style.display='none'" />
      </td>
      <td style="padding:10px 4px">
        <div style="font-weight: 600">${i.name}</div>
        <div style="font-size: 10px; color: #666; margin-top: 2px">${i.description || ''}</div>
      </td>
      <td style="padding:10px 4px;text-align:center">${i.quantity}</td>
      <td style="padding:10px 4px;text-align:right">GHS ${fmt(i.price)}</td>
      <td style="padding:10px 4px;text-align:right">GHS ${fmt(i.total)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
  html, body { height: 100%; margin: 0; padding: 0; }
  body { font-family: 'Roboto', 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; line-height: 1.4; }
  .page-wrapper {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding: 40px;
    box-sizing: border-box;
  }
  .content-top { flex: 1; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #16a34a; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { width: 56px; height: 56px; object-fit: contain; }
  .brand { font-size: 18px; font-weight: 900; color: #16a34a; margin-top: 6px; }
  .doc-type { font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #111; text-align: right; }
  .meta { font-size: 11px; color: #666; text-align: right; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 30px; }
  .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; }
  .value { font-size: 13px; font-weight: 600; color: #111; margin-top: 3px; }
  
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; padding: 8px 4px; border-bottom: 1px solid #e5e7eb; }
  
  .terms-section { margin-top: 30px; }
  .terms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .term-item { margin-bottom: 10px; }
  
  .totals-section { 
    margin-top: 20px; 
    padding-top: 20px; 
    border-top: 1px solid #f3f4f6;
  }
  .totals-table { width: 100%; margin-left: auto; max-width: 300px; }
  .total-row td { padding: 4px 0; font-size: 13px; }
  .grand-total { border-top: 2px solid #16a34a; margin-top: 8px; padding-top: 12px !important; font-size: 18px !important; font-weight: 900; color: #16a34a; }
  
  .signatures-section { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
  .sig-block { text-align: center; width: 200px; }
  .sig-line { border-top: 1px solid #ccc; margin-top: 50px; padding-top: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .sig-img { height: 50px; object-fit: contain; margin-bottom: -10px; }
  
  .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #999; text-align: center; }
</style></head><body>
  <div class="page-wrapper">
    <div class="content-top">
      <div class="header">
        <div style="display: flex; align-items: center; gap: 15px;">
          <img src="${LOGO_BASE64 || `${BASE_URL}/assets/Company logo.png`}" class="logo" alt="Expert Office Logo" />
          <div>
            <div class="brand">Expert Office Furnish</div>
            <div style="font-size: 10px; color: #666; margin-top: 2px">Your Health, Your Wealth</div>
          </div>
        </div>
        <div>
          <div class="doc-type">Proforma Invoice</div>
          <div class="meta"># ${invoice.invoice_number}</div>
          <div class="meta">${new Date(invoice.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      <div class="grid">
        <div>
          <div class="label">Billed To</div>
          <div class="value">${invoice.client_name}</div>
          <div style="font-size: 12px; color: #555; margin-top: 2px">${invoice.client_email || ''}</div>
          ${invoice.client_address ? `<div style="font-size: 11px; color: #666; margin-top: 2px">${invoice.client_address}</div>` : ''}
        </div>
        <div>
          <div class="label">Invoice Details</div>
          <div style="font-size: 12px; color: #555; margin-top: 3px">Validity: <strong>${invoice.validity_days}</strong></div>
          <div style="font-size: 12px; color: #555">Warranty: <strong>${invoice.warranty}</strong></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: center; width: 60px;">Picture</th>
            <th>Item / Description</th><th style="text-align: center">Qty</th>
            <th style="text-align: right">Unit Price</th><th style="text-align: right">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="terms-section">
        <div class="label" style="margin-bottom: 10px">Terms & Conditions</div>
        <div class="terms-grid">
           <div class="term-item">
             <div style="font-size: 10px; font-weight: 700; color: #555">DELIVERY TERMS</div>
             <div style="font-size: 11px; color: #666">${invoice.delivery_terms}</div>
           </div>
           <div class="term-item">
             <div style="font-size: 10px; font-weight: 700; color: #555">PAYMENT TERMS</div>
             <div style="font-size: 11px; color: #666">${invoice.payment_terms}</div>
           </div>
        </div>
      </div>

    </div>

    <div class="totals-section">
      <table class="totals-table">
        <tbody>
          <tr class="total-row">
            <td style="color: #666">Subtotal</td>
            <td style="text-align: right; font-weight: 600">GHS ${fmt(invoice.subtotal)}</td>
          </tr>
          <tr class="total-row">
            <td style="color: #666">VAT (${invoice.vat_percentage}%)</td>
            <td style="text-align: right; font-weight: 600">GHS ${fmt(invoice.vat_amount)}</td>
          </tr>
          <tr class="total-row grand-total">
            <td>Grand Total</td>
            <td style="text-align: right">GHS ${fmt(invoice.grand_total)}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="signatures-section">
        <div class="sig-block">
          ${sigBase64 ? `<img src="${sigBase64}" class="sig-img" alt="Signature" />` : '<div style="height: 40px"></div>'}
          <div class="sig-line">Expert Representative: ${invoice.creator_name || 'Admin'}</div>
        </div>
        <div class="sig-block">
          <div style="height: 40px"></div>
          <div class="sig-line">Client Approval & Signature</div>
        </div>
      </div>

      <div class="footer">Your health, your wealth. — Expert Office Furnish</div>
    </div>
  </div>
</body></html>`;
};

module.exports = { buildProformaHtml };
