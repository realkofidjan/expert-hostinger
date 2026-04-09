const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
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
