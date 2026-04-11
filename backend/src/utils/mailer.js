const { Resend } = require('resend');

// Resend uses HTTPS (port 443) — works perfectly on Railway.
// No SMTP ports needed, no IPv6 issues.
const resend = new Resend(process.env.RESEND_API_KEY);

const sendMail = async ({ to, subject, html, text, attachments }) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured. Add it to your environment variables.');
  }

  const fromAddress = process.env.EMAIL_FROM || 'Expert Office Furnish <onboarding@resend.dev>';

  // Convert nodemailer-style attachments to Resend format
  const resendAttachments = attachments?.map(att => ({
    filename: att.filename,
    content: att.content instanceof Buffer ? att.content : Buffer.from(att.content),
  }));

  await resend.emails.send({
    from: fromAddress,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
    attachments: resendAttachments,
  });
};

module.exports = { sendMail };
