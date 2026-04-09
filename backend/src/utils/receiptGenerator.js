const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`;

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
  console.error('Error loading logo for receipt:', err.message);
}

const buildReceiptHtml = (order, items, cfg, docType) => {
  const fmt = (n) => parseFloat(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 });
  const methodLabel = { cash: 'Cash', bank_transfer: 'Bank Transfer', momo: 'Mobile Money' }[order.payment_method] || order.payment_method;

  let addrHtml = '';
  if (order.delivery_mode === 'delivery') {
    try {
      const a = JSON.parse(order.shipping_address || '{}');
      addrHtml = [a.address, a.city, order.region, a.landmark].filter(Boolean).join(', ');
    } catch { }
  } else {
    addrHtml = cfg.pickup_address || '';
  }

  const rows = items.map(i => `
    <tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:10px 4px">
        ${i.product_name}
        ${i.color ? `<div style="font-size:10px;color:#666;margin-top:2px;text-transform:uppercase;font-weight:700">Color: ${i.color}</div>` : ''}
      </td>
      <td style="padding:10px 4px;text-align:center">${i.quantity}</td>
      <td style="padding:10px 4px;text-align:right">₵${fmt(i.unit_price)}</td>
      <td style="padding:10px 4px;text-align:right">₵${fmt(i.subtotal)}</td>
    </tr>`).join('');

  const deliveryRow = parseFloat(order.delivery_fee) > 0
    ? `<tr><td colspan="3" style="text-align:right;padding:8px 4px;color:#555">Delivery Fee</td><td style="text-align:right;padding:8px 4px">₵${fmt(order.delivery_fee)}</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  html, body { height: 100%; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; line-height: 1.4; }
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
  
  .totals-section { 
    margin-top: auto; 
    padding-top: 20px; 
    border-top: 1px solid #f3f4f6;
  }
  .totals-table { width: 100%; margin-left: auto; max-width: 250px; }
  .total-row td { padding: 4px 0; font-size: 13px; }
  .grand-total { border-top: 2px solid #16a34a; margin-top: 8px; padding-top: 12px !important; font-size: 16px !important; font-weight: 900; color: #16a34a; }
  
  .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #999; text-align: center; }
</style></head><body>
  <div class="page-wrapper">
    <div class="content-top">
      <div class="header">
        <div style="display: flex; align-items: center; gap: 15px;">
          <img src="${LOGO_BASE64 || `${BASE_URL}/assets/Company logo.png`}" class="logo" alt="Expert Office Logo" />
          <div>
            <div class="brand">Expert Office Furnish</div>
            ${cfg.pickup_address ? `<div style="font-size: 10px; color: #666; margin-top: 2px">${cfg.pickup_address}</div>` : ''}
          </div>
        </div>
        <div>
          <div class="doc-type">${docType}</div>
          <div class="meta">${order.order_number}</div>
          <div class="meta">${new Date(order.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      <div class="grid">
        <div>
          <div class="label">Billed To</div>
          <div class="value">${order.customer_name}</div>
          <div style="font-size: 12px; color: #555; margin-top: 2px">${order.customer_email}</div>
          ${order.customer_phone ? `<div style="font-size: 12px; color: #555">${order.customer_phone}</div>` : ''}
        </div>
        <div>
          <div class="label">Order Details</div>
          <div style="font-size: 12px; color: #555; margin-top: 3px">Payment: <strong>${methodLabel}</strong></div>
          <div style="font-size: 12px; color: #555">Delivery: <strong style="text-transform: capitalize">${order.delivery_mode || 'pickup'}</strong></div>
          ${addrHtml ? `<div style="font-size: 11px; color: #666; margin-top: 2px">${addrHtml}</div>` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th><th style="text-align: center">Qty</th>
            <th style="text-align: right">Unit Price</th><th style="text-align: right">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="totals-section">
      <table class="totals-table">
        <tbody>
          <tr class="total-row">
            <td style="color: #666">Subtotal</td>
            <td style="text-align: right; font-weight: 600">₵${fmt(order.subtotal || (order.total_amount - (order.delivery_fee || 0)))}</td>
          </tr>
          ${parseFloat(order.delivery_fee) > 0 ? `
          <tr class="total-row">
            <td style="color: #666">Delivery Fee</td>
            <td style="text-align: right; font-weight: 600">₵${fmt(order.delivery_fee)}</td>
          </tr>` : ''}
          <tr class="total-row grand-total">
            <td>Total</td>
            <td style="text-align: right">₵${fmt(order.total_amount)}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="footer">Thank you for your business! — Expert Office Furnish</div>
    </div>
  </div>
</body></html>`;
};

module.exports = { buildReceiptHtml };
