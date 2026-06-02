import nodemailer from 'nodemailer';

const sendEmail = async (to, subject, text, html) => {
    try {
        const hasSMTP = process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS;

        if (hasSMTP) {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT),
                secure: process.env.SMTP_PORT === "465", // true for port 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            const info = await transporter.sendMail({
                from: `"Mediconsult Notifications" <${process.env.SMTP_USER}>`,
                to,
                subject,
                text,
                html,
            });

            console.log(`[SMTP] Real Email Sent successfully: ${info.messageId} to ${to}`);
            return true;
        } else {
            console.log(`
=========================================
[NOTIFICATIONS MOCK - NO SMTP CONFIGURED]
=========================================
TO: ${to}
SUBJECT: ${subject}
TEXT: ${text}
=========================================
            `);
            return true;
        }
    } catch (error) {
        console.error(`[SMTP ERROR] Failed to send email to ${to}:`, error);
        return false; // Fail silently so backend logic is not broken
    }
};

export default sendEmail;
