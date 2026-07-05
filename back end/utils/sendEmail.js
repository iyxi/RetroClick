const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
        port: Number(process.env.SMTP_PORT || 2525),
        auth: {
            user: process.env.SMTP_EMAIL || 'a19016ef8a47f9',
            pass: process.env.SMTP_PASSWORD || '5721b4d838d434'
        }
    });

    const message = {
        from: `${process.env.SMTP_FROM_NAME || 'RetroClick'} <${process.env.SMTP_FROM_EMAIL || 'no-reply@retroclick.test'}>`,
        to: options.email,
        subject: options.subject,
        html: options.html || `<p>${options.message || ''}</p>`,
        attachments: options.attachments || []
    };

    await transporter.sendMail(message);
};

module.exports = sendEmail;
