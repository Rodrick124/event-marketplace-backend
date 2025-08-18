const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

function getTransporter() {
	return nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT || 587),
		secure: false,
		auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
	});
}

async function sendMail({ to, subject, html }) {
	const from = process.env.SMTP_FROM || 'no-reply@example.com';
	const transporter = getTransporter();
	await transporter.sendMail({ from, to, subject, html });
}

module.exports = { sendMail };

async function sendRegistrationEmail({ to, name }) {
	const html = `<p>Hi ${name},</p><p>Welcome to Event Marketplace! Your account has been created successfully.</p>`;
	await sendMail({ to, subject: 'Welcome to Event Marketplace', html });
}

async function generateTicketQrDataUrl({ reservationId, eventId, userId }) {
	const payload = JSON.stringify({ reservationId, eventId, userId });
	return QRCode.toDataURL(payload, { margin: 1, width: 220 });
}

async function sendBookingConfirmation({ to, name, eventTitle, quantity, reservationId, eventId, userId }) {
	const qrDataUrl = await generateTicketQrDataUrl({ reservationId, eventId, userId });
	const html = `
		<p>Hi ${name},</p>
		<p>Your booking for <strong>${eventTitle}</strong> (${quantity} ticket(s)) is confirmed.</p>
		<p>Present this QR code at the venue:</p>
		<p><img alt="Ticket QR" src="${qrDataUrl}" /></p>
	`;
	await sendMail({ to, subject: 'Your booking is confirmed', html });
}

module.exports.sendRegistrationEmail = sendRegistrationEmail;
module.exports.sendBookingConfirmation = sendBookingConfirmation;
module.exports.generateTicketQrDataUrl = generateTicketQrDataUrl;


