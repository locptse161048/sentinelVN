const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

/**
 * Generate a 6-digit OTP
 */
function generateOTP() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash OTP using bcrypt for secure storage
 */
async function hashOTP(otp) {
	const salt = await bcrypt.genSalt(10);
	return bcrypt.hash(otp, salt);
}

/**
 * Compare plain OTP with hashed OTP
 */
async function verifyOTP(plainOTP, hashedOTP) {
	return bcrypt.compare(plainOTP, hashedOTP);
}

// ✅ Khởi tạo OAuth2 Client 1 lần duy nhất
const oauth2Client = new google.auth.OAuth2(
	process.env.GMAIL_CLIENT_ID,
	process.env.GMAIL_CLIENT_SECRET,
	'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
	refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

/**
 * Send OTP email to user via Gmail API + OAuth2
 */
async function sendOTPEmail(email, otp) {
	try {
		// ✅ Lấy Access Token mới từ Refresh Token
		const { token: accessToken } = await oauth2Client.getAccessToken();

		if (!accessToken) {
			throw new Error('Không thể lấy access token từ Google');
		}

		// ✅ Tạo transporter với OAuth2
		const transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				type: 'OAuth2',
				user: process.env.GMAIL_USER,
				clientId: process.env.GMAIL_CLIENT_ID,
				clientSecret: process.env.GMAIL_CLIENT_SECRET,
				refreshToken: process.env.GMAIL_REFRESH_TOKEN,
				accessToken: accessToken
			}
		});

		// ✅ Gửi email
		const info = await transporter.sendMail({
			from: `"SentinelVN" <${process.env.GMAIL_USER}>`,
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
						<p style="color: #cbd5e1; margin-bottom: 20px;">Mã xác thực của bạn sẽ hết hạn trong <strong>2 phút</strong>.</p>

						<div style="text-align: center; padding: 20px; background-color: #0f172a; border-radius: 6px; margin-bottom: 20px;">
							<code style="font-size: 36px; font-weight: bold; color: #22d3ee; letter-spacing: 8px;">${otp}</code>
						</div>

						<p style="color: #cbd5e1; font-size: 12px; margin: 10px 0;">
							⏰ <strong>Hạn sử dụng:</strong> 2 phút từ khi nhận email này
						</p>
						<p style="color: #cbd5e1; font-size: 12px; margin: 10px 0;">
							🔐 <strong>Lưu ý:</strong> Không chia sẻ mã này với bất kỳ ai
						</p>
					</div>

					<div style="border-top: 1px solid #334155; padding-top: 20px; text-align: center;">
						<p style="color: #94a3b8; font-size: 12px; margin: 0;">
							Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
						</p>
						<p style="color: #64748b; font-size: 11px; margin: 10px 0 0 0;">
							© SENTINEL VN - Bảo vệ ứng dụng của bạn
						</p>
					</div>
				</div>
			`,
			text: `Mã xác thực của bạn là: ${otp}\nMã này sẽ hết hạn trong 2 phút.`
		});

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
	sendOTPEmail
};