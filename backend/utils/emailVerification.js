const { google } = require('googleapis');
const bcrypt = require('bcryptjs');

// ================= OTP FUNCTIONS =================

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

// ================= GMAIL OAUTH2 =================

// Khởi tạo OAuth2 client
const oauth2Client = new google.auth.OAuth2(
	process.env.GMAIL_CLIENT_ID,
	process.env.GMAIL_CLIENT_SECRET,
	'https://developers.google.com/oauthplayground'
);

// Gán refresh token
oauth2Client.setCredentials({
	refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

// ================= SEND EMAIL VIA GMAIL API =================

/**
 * Send OTP email using Gmail API (NO SMTP)
 */
async function sendOTPEmail(email, otp) {
	console.log('[DEBUG] Sending OTP to:', email);

	// ✅ Validate email
	if (!email || typeof email !== 'string' || !email.trim()) {
		throw new Error('Email không hợp lệ');
	}

	const cleanEmail = email.trim().toLowerCase();

	try {
		// ✅ Lấy access token
		const accessTokenResponse = await oauth2Client.getAccessToken();
		const accessToken = accessTokenResponse?.token;

		console.log('[DEBUG] AccessToken:', accessToken ? 'OK' : 'NULL');

		if (!accessToken) {
			throw new Error('Không lấy được access token');
		}

		// ✅ Gmail API
		const gmail = google.gmail({
			version: 'v1',
			auth: oauth2Client
		});

		// ✅ FORMAT EMAIL CHUẨN (KHÔNG dùng template string)
		const subject = '🔐 Mã xác thực Email - SENTINEL VN';

		const messageParts = [
			`From: "SentinelVN" <${process.env.GMAIL_USER}>`,
			`To: ${cleanEmail}`,
			`Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
			'MIME-Version: 1.0',
			'Content-Type: text/html; charset="UTF-8"',
			'',
			`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #0f172a; color: #e0e7ff; border-radius: 8px;">
				<h2 style="color: #22d3ee; text-align: center;">SENTINEL VN</h2>
				<p style="text-align: center; color: #94a3b8;">Security-as-a-Plugin</p>

				<div style="background-color: #1e293b; padding: 20px; border-radius: 8px; margin-top: 20px;">
					<h3 style="color: #22d3ee;">Xác thực Email của bạn</h3>
					<p>Mã OTP của bạn sẽ hết hạn trong <b>2 phút</b>.</p>

					<div style="text-align: center; margin: 20px 0;">
						<span style="font-size: 36px; letter-spacing: 8px; font-weight: bold; color: #22d3ee;">
							${otp}
						</span>
					</div>

					<p style="font-size: 12px;">⏰ Hạn sử dụng: 2 phút</p>
					<p style="font-size: 12px;">🔐 Không chia sẻ mã này với bất kỳ ai</p>
				</div>

				<p style="text-align: center; font-size: 12px; color: #64748b; margin-top: 20px;">
					Nếu bạn không yêu cầu, hãy bỏ qua email này.
				</p>
			</div>`
		];

		const message = messageParts.join('\n');

		// ✅ Encode base64 URL-safe
		const encodedMessage = Buffer.from(message)
			.toString('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');

		// ✅ Gửi email
		await gmail.users.messages.send({
			userId: 'me',
			requestBody: {
				raw: encodedMessage
			}
		});

		console.log('[EMAIL] ✅ Sent to:', cleanEmail);
		return true;

	} catch (err) {
		console.error('[EMAIL] ❌ Error:', err.message);

		if (err.response?.data) {
			console.error('[EMAIL] Google API Error:', err.response.data);
		}

		throw err;
	}
}

// ================= EXPORT =================

module.exports = {
	generateOTP,
	hashOTP,
	verifyOTP,
	sendOTPEmail
};