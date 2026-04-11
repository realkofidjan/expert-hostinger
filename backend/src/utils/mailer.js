const nodemailer = require('nodemailer');
const dns = require('dns');
const net = require('net');

// Nuclear IPv4 override for Railway (no outbound IPv6 support).
// We override the DNS lookup that nodemailer uses internally so it
// can ONLY ever resolve to an IPv4 address.
const ipv4Lookup = (hostname, options, callback) => {
  // Handle both (hostname, callback) and (hostname, options, callback) signatures
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  // If the hostname is already an IPv4 address, return it directly
  if (net.isIPv4(hostname)) {
    return callback(null, hostname, 4);
  }
  dns.resolve4(hostname, (err, addresses) => {
    if (err) return callback(err);
    callback(null, addresses[0], 4);
  });
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  dnsLookup: ipv4Lookup,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendMail = async ({ to, subject, html, text, attachments }) => {
  if (!process.env.SMTP_USER) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }
  await transporter.sendMail({
    from: `"Expert Office Furnish" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
    attachments,
  });
};

module.exports = { sendMail };
