const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate a 6-digit OTP
 * @returns {string} 6-digit OTP code
 */
function generateOTP() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash OTP using bcrypt for secure storage
 * @param {string} otp - Plain OTP code
 * @returns {Promise<string>} Hashed OTP
 */
async function hashOTP(otp) {
	const salt = await bcrypt.genSalt(10);
	return bcrypt.hash(otp, salt);
}

/**
 * Compare plain OTP with hashed OTP
 * @param {string} plainOTP - Plain OTP code from user
 * @param {string} hashedOTP - Hashed OTP from database
 * @returns {Promise<boolean>} True if OTP matches
 */
async function verifyOTP(plainOTP, hashedOTP) {
	return bcrypt.compare(plainOTP, hashedOTP);
}

/**
 * Create nodemailer transporter
 * @returns {Object} Nodemailer transporter
 */
function createTransporter() {
	return nodemailer.createTransport({
		service: 'gmail', // or your email service
		host: process.env.SMTP_HOST || 'smtp.gmail.com',
		port: process.env.SMTP_PORT || 587,
		secure: false, // true for 465, false for other ports
		auth: {
			user: process.env.OTPEMAIL || process.env.EMAIL_USER,
			pass: process.env.OTPEMAIL_PASSWORD || process.env.EMAIL_PASSWORD
		}
	});
}

/**
 * Send OTP email to user
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code to send
 * @returns {Promise<boolean>} True if email sent successfully
 */
async function sendOTPEmail(email, otp) {
	try {
		const transporter = createTransporter();

		const mailOptions = {
			from: process.env.OTPEMAIL || process.env.EMAIL_USER,
			to: email,
			subject: '🔐 Mã xác thực Email - SENTINEL VN',
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; background-color: #0f172a; color: #e0e7ff;">
					<div style="text-align: center; margin-bottom: 30px;">
						<h2 style="color: #22d3ee; margin: 0;">SENTINEL VN</h2>
						<p style="color: #94a3b8; font-size: 14px; margin: 5px 0 0 0;">Security-as-a-Plugin</p>
					</div>

					<div style="padding: 20px; background-color: #1e293b; border-radius: 8px; margin-bottom: 20px;">
						<h3 style="margin-top: 0; color: #22d3ee;">Xác thực Email của Bạn</h3>
						<p style="color: #cbd5e1; margin-bottom: 20px;">Đây là mã xác thực email của bạn. Mã này sẽ hết hạn trong 2 phút.</p>

						<div style="text-align: center; padding: 20px; background-color: #0f172a; border-radius: 6px; margin-bottom: 20px;">
							<code style="font-size: 32px; font-weight: bold; color: #22d3ee; letter-spacing: 5px;">${otp}</code>
						</div>

						<p style="color: #cbd5e1; font-size: 12px; margin: 10px 0;">
							⏰ <strong>Hạn sử dụng:</strong> 2 phút từ khi nhận email này
						</p>
						<p style="color: #cbd5e1; font-size: 12px; margin: 10px 0;">
							🔐 <strong>Lưu ý bảo mật:</strong> Không bao giờ chia sẻ mã này với bất kỳ ai
						</p>
					</div>

					<div style="border-top: 1px solid #334155; padding-top: 20px; text-align: center;">
						<p style="color: #94a3b8; font-size: 12px; margin: 0;">
							Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
						</p>
						<p style="color: #64748b; font-size: 11px; margin: 10px 0 0 0;">
							©️ SENTINEL VN - Bảo vệ ứng dụng của bạn
						</p>
					</div>
				</div>
			`,
			text: `Mã xác thực của bạn là: ${otp}\nMã này sẽ hết hạn trong 2 phút.`
		};

		const info = await transporter.sendMail(mailOptions);
		console.log('[EMAIL] ✅ OTP sent to:', email, '- MessageID:', info.messageId);
		return true;
	} catch (err) {
		console.error('[EMAIL] ❌ Error sending OTP email:', err.message);
		throw err;
	}
}

module.exports = {
	generateOTP,
	hashOTP,
	verifyOTP,
	sendOTPEmail,
	createTransporter
};
