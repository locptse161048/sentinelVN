const express = require('express');
const router = express.Router();
const Client = require('../models/client');
const EmailVerification = require('../models/emailVerification');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateOTP, hashOTP, verifyOTP, sendOTPEmail } = require('../utils/emailVerification');
const rateLimit = require('express-rate-limit');

// ⚠️ SECURITY: Helper function to validate email format
function isValidEmail(email) {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

// ⚠️ SECURITY: Helper function to validate password strength
function validatePassword(password) {
	if (!password || password.length < 8) {
		return { valid: false, message: 'Mật khẩu phải tối thiểu 8 ký tự' };
	}
	if (!/[A-Z]/.test(password)) {
		return { valid: false, message: 'Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa' };
	}
	if (!/[a-z]/.test(password)) {
		return { valid: false, message: 'Mật khẩu phải chứa ít nhất 1 chữ cái viết thường' };
	}
	if (!/[0-9]/.test(password)) {
		return { valid: false, message: 'Mật khẩu phải chứa ít nhất 1 chữ số' };
	}
	return { valid: true };
}

// ⚠️ SECURITY: Rate limiters from server.js app.locals
const getMiddleware = (req, res, next) => {
	const middlewareName = req.baseUrl + req.path;
	if (middlewareName.includes('/login') && req.app.locals.loginLimiter) {
		return req.app.locals.loginLimiter(req, res, next);
	} else if (middlewareName.includes('/register') && req.app.locals.registerLimiter) {
		return req.app.locals.registerLimiter(req, res, next);
	}
	next();
};

// Đăng ký (Email OTP Required)
router.post('/register', getMiddleware, async (req, res) => {
	const { 
		email, 
		password, 
		fullName, 
		firstName, 
		lastName, 
		gender, 
		city,
		emailVerified
	} = req.body;
	
	// ⚠️ SECURITY: Input validation
	if (!email || !isValidEmail(email)) {
		return res.status(400).json({ message: "Email không hợp lệ" });
	}
	
	if (!fullName || fullName.trim().length === 0) {
		return res.status(400).json({ message: "Vui lòng nhập họ và tên" });
	}
	if (fullName.length > 100) {
		return res.status(400).json({ message: "Họ và tên quá dài (max 100 ký tự)" });
	}
	
	const passValidation = validatePassword(password);
	if (!passValidation.valid) {
		return res.status(400).json({ message: passValidation.message });
	}
	
	if (city && city.length > 100) {
		return res.status(400).json({ message: "Thành phố quá dài (max 100 ký tự)" });
	}
	
	if (gender && !['nam', 'nữ', 'khác'].includes(gender)) {
		return res.status(400).json({ message: "Giới tính không hợp lệ" });
	}

	// ⚠️ SECURITY: Verify email was confirmed via OTP
	if (!emailVerified) {
		return res.status(400).json({ message: "Email chưa được xác thực. Vui lòng xác thực email trước." });
	}
	
	try {
		const existing = await Client.findOne({ email: email.toLowerCase() });
		if (existing) return res.status(400).json({ message: 'Email đã tồn tại' });
		
		const hash = await bcrypt.hash(password, 10);
		const user = await Client.create({
			email: email.toLowerCase(),
			fullName: fullName.trim(),
			firstName: firstName ? firstName.trim() : null,
			lastName: lastName ? lastName.trim() : null,
			gender: gender || null,
			city: city ? city.trim() : null,
			passwordHash: hash,
			role: 'client',
			status: 'đang hoạt động'
		});
		
		// ✅ Emit socket event to notify admin of new client registration
		const io = req.app.locals.io;
		if (io) {
			io.emit('new_client_registered', {
				_id: user._id,
				email: user.email,
				fullName: user.fullName,
				firstName: user.firstName || '-',
				lastName: user.lastName || '-',
				gender: user.gender || '-',
				city: user.city || '-',
				status: user.status,
				createdAt: user.createdAt,
				licenseStatus: 'pending',
				licenseKey: '-',
				plan: '-'
			});
			console.log('[SOCKET] Emitted new_client_registered event');
		}
		
		console.log('[AUTH REGISTER] ✅ User registered via email OTP:', user.email);
		res.json({ 
			message: 'Đăng ký thành công', 
			user: { 
				_id: user._id, 
				email: user.email, 
				fullName: user.fullName,
				firstName: user.firstName,
				lastName: user.lastName,
				city: user.city
			} 
		});
	} catch (err) {
		// ⚠️ SECURITY: Don't log sensitive errors
		console.error('[AUTH REGISTER] Error:', err.message);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// ========= LOGIN BY EMAIL =========
router.post('/login', getMiddleware, async (req, res) => {
	const { email, password } = req.body;
	
	// ⚠️ SECURITY: Input validation
	if (!email || !isValidEmail(email)) {
		return res.status(400).json({ message: 'Sai email hoặc mật khẩu' });
	}
	if (!password || password.length === 0) {
		return res.status(400).json({ message: 'Sai email hoặc mật khẩu' });
	}
	
	try {
		const user = await Client.findOne({ email: email.toLowerCase() });
		if (!user) return res.status(400).json({ message: 'Sai email hoặc mật khẩu' });

		// ⚠️ Security check: Account suspended
		if (user.status === 'tạm ngưng') {
			return res.status(403).json({ message: 'Tài khoản của bạn đã bị tạm ngưng' });
		}

		const match = await bcrypt.compare(password, user.passwordHash);
		if (!match) {
			// Increment login attempts
			user.loginAttempts = (user.loginAttempts || 0) + 1;
			user.lastLoginAttempt = new Date();

			// If 5+ failed attempts, suspend account
			if (user.loginAttempts >= 6) {
				user.status = 'tạm ngưng';
				await user.save();
				return res.status(403).json({ message: 'Tài khoản đã bị tạm ngưng do nhập sai mật khẩu nhiều lần' });
			}

			await user.save();
			return res.status(400).json({ message: 'Sai email hoặc mật khẩu' });
		}

		// ✅ Login successful - reset attempts
		user.loginAttempts = 0;
		user.lastLoginAttempt = new Date();
		await user.save();
		
		// ✅ Set session BEFORE saving
		req.session.userId = user._id;
		req.session.email = user.email;
		req.session.role = user.role;
		
		console.log("[AUTH LOGIN] ▶ Setting session for:", user.email);
		console.log("[AUTH LOGIN] ▶ SessionID:", req.sessionID);
		console.log("[AUTH LOGIN] ▶ User role:", user.role);

		// ✅ Save session to MongoDB
		req.session.save((err) => {
			if (err) {
				console.error("[AUTH LOGIN] ❌ Session save error:", err.message);
				return res.status(500).json({ message: "Lỗi lưu session" });
			}
			
			console.log("[AUTH LOGIN] ✅ Session saved to MongoDB for:", user.email);
			
			res.json({
				message: "Đăng nhập thành công",
				token: req.sessionID,
				user: {
					_id: user._id,
					email: user.email,
					role: user.role,
					fullName: user.fullName,
					status: user.status
				}
			});
		});
	} catch (err) {
		console.error("[AUTH LOGIN] ❌ Server error:", err.message);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// ========= LOGIN BY PHONE =========
router.post('/login/phone', getMiddleware, async (req, res) => {
	const { phone, password } = req.body;
	
	// ⚠️ SECURITY: Input validation
	if (!phone || !/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
		return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
	}
	if (!password || password.length === 0) {
		return res.status(400).json({ message: 'Sai số điện thoại hoặc mật khẩu' });
	}
	
	try {
		const user = await Client.findOne({ phone: phone.replace(/\D/g, '') });
		if (!user) return res.status(400).json({ message: 'Sai số điện thoại hoặc mật khẩu' });

		// ⚠️ Security check: Account suspended
		if (user.status === 'tạm ngưng') {
			return res.status(403).json({ message: 'Tài khoản của bạn đã bị tạm ngưng' });
		}

		const match = await bcrypt.compare(password, user.passwordHash);
		if (!match) {
			// Increment login attempts
			user.loginAttempts = (user.loginAttempts || 0) + 1;
			user.lastLoginAttempt = new Date();

			// If 5+ failed attempts, suspend account
			if (user.loginAttempts >= 6) {
				user.status = 'tạm ngưng';
				await user.save();
				return res.status(403).json({ message: 'Tài khoản đã bị tạm ngưng do nhập sai mật khẩu nhiều lần' });
			}

			await user.save();
			return res.status(400).json({ message: 'Sai số điện thoại hoặc mật khẩu' });
		}

		// ✅ Login successful - reset attempts
		user.loginAttempts = 0;
		user.lastLoginAttempt = new Date();
		await user.save();
		
		// ✅ Set session BEFORE saving
		req.session.userId = user._id;
		req.session.email = user.email;
		req.session.role = user.role;
		
		console.log("[AUTH LOGIN PHONE] ▶ Setting session for:", user.phone);

		// ✅ Save session to MongoDB
		req.session.save((err) => {
			if (err) {
				console.error("[AUTH LOGIN PHONE] ❌ Session save error:", err.message);
				return res.status(500).json({ message: "Lỗi lưu session" });
			}
			
			console.log("[AUTH LOGIN PHONE] ✅ Session saved to MongoDB for:", user.phone);
			
			res.json({
				message: "Đăng nhập thành công",
				token: req.sessionID,
				user: {
					_id: user._id,
					email: user.email,
					phone: user.phone,
					role: user.role,
					fullName: user.fullName,
					status: user.status
				}
			});
		});
	} catch (err) {
		console.error("[AUTH LOGIN PHONE] ❌ Server error:", err.message);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

//logout route
router.post('/logout', (req, res) => {
	req.session.destroy(() => {
		res.clearCookie('sentinel_session');
		res.clearCookie('connect.sid');
		res.json({ message: "Đã đăng xuất" });
	});
});

// Kiểm tra session via Authorization header
// Frontend sends: Authorization: Bearer <token>
router.get('/session', async (req, res) => {
	try {
		// 🔑 Extract token from Authorization header
		const authHeader = req.get('Authorization');
		const token = authHeader && authHeader.startsWith('Bearer ') 
			? authHeader.substring(7)
			: null;
		
		console.log("[AUTH SESSION] ▶ Checking session via Authorization header");
		console.log("[AUTH SESSION] ▶ Token received:", token ? token.substring(0, 20) + '...' : 'missing');
		
		if (!token) {
			console.warn("[AUTH SESSION] ❌ No token in Authorization header");
			return res.status(401).json({ message: "Chưa đăng nhập" });
		}
		
		// ✅ Get session store from app locals
		const sessionStore = req.app.locals.sessionStore;
		if (!sessionStore) {
			console.error("[AUTH SESSION] ❌ Session store not available");
			return res.status(500).json({ message: "Lỗi server" });
		}
		
		// Query MongoDB session store
		sessionStore.get(token, async (err, sessionData) => {
			if (err) {
				console.error("[AUTH SESSION] ❌ Session store query error:", err.message);
				return res.status(401).json({ message: "Phiên không hợp lệ" });
			}
			
			if (!sessionData || !sessionData.userId) {
				console.warn("[AUTH SESSION] ❌ No session found for token");
				return res.status(401).json({ message: "Chưa đăng nhập" });
			}
			
			try {
				const user = await Client.findById(sessionData.userId);
				
				if (!user) {
					console.warn("[AUTH SESSION] ❌ User not found in DB");
					return res.status(401).json({ message: "User không tồn tại" });
				}
				
				console.log("[AUTH SESSION] ✅ Session verified for:", user.email, "Role:", user.role);
				
				res.json({
					_id: user._id,
					email: user.email,
					role: user.role,
					fullName: user.fullName,
					gender: user.gender,
					phone: user.phone,
					address: user.address
				});
			} catch (userErr) {
				console.error("[AUTH SESSION] ❌ User lookup error:", userErr.message);
				res.status(500).json({ message: "Lỗi server" });
			}
		});
	} catch (err) {
		console.error("[AUTH SESSION] ❌ Error:", err.message);
		res.status(500).json({ message: "Lỗi server" });
	}
});

// Lấy thông tin người dùng
router.get('/me', async (req, res) => {
	if (!req.session.userId) {
		return res.status(401).json({ message: "Chưa đăng nhập" });
	}

	try {
		const user = await Client.findById(req.session.userId);
		if (!user) {
			return res.status(404).json({ message: "User không tồn tại" });
		}

		res.json({
			email: user.email,
			fullName: user.fullName,
			gender: user.gender,
			phone: user.phone,
			address: user.address,
			role: user.role,
			plan: user.plan,
			status: user.status
		});
	} catch (err) {
		res.status(500).json({ message: "Lỗi server" });
	}
});


// ========= VERIFY PHONE FROM REGISTRATION =========
// Được gọi sau khi user xác thực phone qua Firebase SMS OTP trong register.html
// Body: { phone, email, password, fullName, firstName, lastName, gender, city }
router.post('/register/verify-phone', async (req, res) => {
	const { phone, email, password, fullName, firstName, lastName, gender, city } = req.body;
	
	// ⚠️ SECURITY: Input validation
	if (!phone || !/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
		return res.status(400).json({ message: "Số điện thoại không hợp lệ" });
	}
	
	if (!email || !isValidEmail(email)) {
		return res.status(400).json({ message: "Email không hợp lệ" });
	}
	
	const passValidation = validatePassword(password);
	if (!passValidation.valid) {
		return res.status(400).json({ message: passValidation.message });
	}
	
	if (!fullName || fullName.trim().length === 0) {
		return res.status(400).json({ message: "Vui lòng nhập họ và tên" });
	}
	if (fullName.length > 100) {
		return res.status(400).json({ message: "Họ và tên quá dài (max 100 ký tự)" });
	}
	
	if (gender && !['nam', 'nữ', 'khác'].includes(gender)) {
		return res.status(400).json({ message: "Giới tính không hợp lệ" });
	}
	
	if (city && city.length > 100) {
		return res.status(400).json({ message: "Thành phố quá dài" });
	}
	
	try {
		// Check if email or phone already exists
		const existingEmail = await Client.findOne({ email: email.toLowerCase() });
		if (existingEmail) return res.status(400).json({ message: 'Email đã tồn tại' });
		
		const existingPhone = await Client.findOne({ phone: phone.replace(/\D/g, '') });
		if (existingPhone) return res.status(400).json({ message: 'Số điện thoại đã tồn tại' });
		
		// Create new user
		const hash = await bcrypt.hash(password, 10);
		const user = await Client.create({
			email: email.toLowerCase(),
			fullName: fullName.trim(),
			firstName: firstName ? firstName.trim() : null,
			lastName: lastName ? lastName.trim() : null,
			gender: gender || null,
			phone: phone.replace(/\D/g, ''),
			city: city ? city.trim() : null,
			phoneVerified: true,
			passwordHash: hash,
			role: 'client',
			status: 'đang hoạt động',
			loginAttempts: 0
		});
		
		// ✅ Emit socket event to notify admin of new client registration
		const io = req.app.locals.io;
		if (io) {
			io.emit('new_client_registered', {
				_id: user._id,
				email: user.email,
				fullName: user.fullName,
				phone: user.phone,
				gender: user.gender || '-',
				city: user.city || '-',
				status: user.status,
				createdAt: user.createdAt,
				licenseStatus: 'pending',
				licenseKey: '-',
				plan: '-'
			});
			console.log('[SOCKET] Emitted new_client_registered event for phone:', user.phone);
		}
		
		res.json({ 
			message: 'Xác thực số điện thoại thành công. Vui lòng đăng nhập.', 
			user: { 
				email: user.email, 
				phone: user.phone,
				fullName: user.fullName 
			} 
		});
	} catch (err) {
		console.error('[AUTH REGISTER VERIFY PHONE] Error:', err.message);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// ========= OTP EMAIL VERIFICATION =========

// ⚠️ SECURITY: Rate limit OTP sending (max 5 requests per 10 minutes per IP)
const otpSendLimiter = rateLimit({
	windowMs: 10 * 60 * 1000, // 10 minutes
	max: 5, // Max 5 send requests
	message: 'Quá nhiều lần yêu cầu gửi OTP. Vui lòng thử lại sau 10 phút.',
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req, res) => {
		// Only apply limiter to /send-otp, not other routes
		return !req.path.includes('/send-otp');
	}
});

// ⚠️ SECURITY: Rate limit OTP verification (max 10 attempts per 15 minutes per IP)
const otpVerifyLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // Max 10 verify attempts
	message: 'Quá nhiều lần xác thực OTP. Vui lòng thử lại sau 15 phút.',
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req, res) => {
		// Only apply limiter to /verify-otp, not other routes
		return !req.path.includes('/verify-otp');
	}
});

/**
 * POST /api/auth/send-otp
 * Send OTP to email
 * Body: { email }
 */
router.post('/send-otp', otpSendLimiter, async (req, res) => {
	const { email } = req.body;

	// ⚠️ SECURITY: Input validation
	if (!email || !isValidEmail(email)) {
		return res.status(400).json({ message: "Email không hợp lệ" });
	}

	const emailLower = email.toLowerCase();

	try {
		// ⚠️ SECURITY: Check if email already registered
		const existing = await Client.findOne({ email: emailLower });
		if (existing) {
			return res.status(400).json({ message: 'Email đã được đăng ký' });
		}

		// ✅ Generate new OTP
		const otp = generateOTP();
		const otpHash = await hashOTP(otp);

		// ✅ Set expiration time (2 minutes from now)
		const expireAt = new Date();
		expireAt.setMinutes(expireAt.getMinutes() + 2);

		// ✅ Delete old OTP if exists
		await EmailVerification.deleteOne({ email: emailLower });

		// ✅ Save new OTP to database
		const verification = await EmailVerification.create({
			email: emailLower,
			otpHash,
			attempts: 0,
			resendCount: 0,
			expireAt
		});

		// ✅ Send OTP email
		try {
			await sendOTPEmail(emailLower, otp);
		} catch (emailErr) {
			console.error('[OTP SEND] Email sending failed:', emailErr.message);
			// Delete the verification record if email sending fails
			await EmailVerification.deleteOne({ _id: verification._id });
			return res.status(500).json({ message: 'Không thể gửi email OTP. Vui lòng thử lại.' });
		}

		console.log('[OTP SEND] ✅ OTP sent to:', emailLower);

		res.json({
			message: 'Mã OTP đã được gửi đến email của bạn',
			expireAt: expireAt.toISOString()
		});

	} catch (err) {
		console.error('[OTP SEND] Error:', err.message);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP code
 * Body: { email, otp }
 */
router.post('/verify-otp', otpVerifyLimiter, async (req, res) => {
	const { email, otp } = req.body;

	// ⚠️ SECURITY: Input validation
	if (!email || !isValidEmail(email)) {
		return res.status(400).json({ message: "Email không hợp lệ" });
	}

	if (!otp || !/^\d{6}$/.test(otp)) {
		return res.status(400).json({ message: "Mã OTP phải là 6 chữ số" });
	}

	const emailLower = email.toLowerCase();

	try {
		// ✅ Find OTP verification record
		let verification = await EmailVerification.findOne({ email: emailLower });

		if (!verification) {
			return res.status(400).json({ message: 'Mã OTP không hợp lệ hoặc đã hết hạn' });
		}

		// ✅ Check if OTP has expired
		if (new Date() > verification.expireAt) {
			await EmailVerification.deleteOne({ _id: verification._id });
			return res.status(400).json({ message: 'Mã OTP không hợp lệ hoặc đã hết hạn' });
		}

		// ⚠️ SECURITY: Check if max attempts reached
		if (verification.attempts >= 3) {
			await EmailVerification.deleteOne({ _id: verification._id });
			return res.status(400).json({ message: 'Vượt quá số lần thử. Vui lòng yêu cầu mã OTP mới.' });
		}

		// ✅ Verify OTP
		const isValidOTP = await verifyOTP(otp, verification.otpHash);

		if (!isValidOTP) {
			// Increment attempts and save
			verification.attempts = (verification.attempts || 0) + 1;
			await verification.save();

			const attemptsLeft = 3 - verification.attempts;
			return res.status(400).json({
				message: `Mã OTP không hợp lệ. Còn ${attemptsLeft} lần thử.`,
				attemptsLeft
			});
		}

		// ✅ OTP verified successfully - delete the record
		await EmailVerification.deleteOne({ _id: verification._id });

		console.log('[OTP VERIFY] ✅ OTP verified for:', emailLower);

		res.json({
			message: 'Xác thực email thành công',
			email: emailLower,
			verified: true
		});

	} catch (err) {
		console.error('[OTP VERIFY] Error:', err.message);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

/**
 * POST /api/auth/resend-otp
 * Resend OTP to email (max 3 times, only after 2 minutes)
 * Body: { email }
 */
router.post('/resend-otp', otpSendLimiter, async (req, res) => {
	const { email } = req.body;

	// ⚠️ SECURITY: Input validation
	if (!email || !isValidEmail(email)) {
		return res.status(400).json({ message: "Email không hợp lệ" });
	}

	const emailLower = email.toLowerCase();

	try {
		// ✅ Find existing OTP verification record
		let verification = await EmailVerification.findOne({ email: emailLower });

		if (!verification) {
			return res.status(400).json({ message: 'Không tìm thấy yêu cầu xác thực. Vui lòng gửi OTP trước.' });
		}

		// ⚠️ SECURITY: Check max resend attempts (max 3 times)
		if (verification.resendCount >= 3) {
			return res.status(400).json({ message: 'Vượt quá số lần gửi lại. Vui lòng yêu cầu mã OTP mới.' });
		}

		// ⚠️ SECURITY: Check minimum time between resends (2 minutes)
		const now = new Date();
		const timeSinceCreation = (now - verification.createdAt) / 1000 / 60; // minutes
		if (timeSinceCreation < 2) {
			const waitTime = Math.ceil(2 - timeSinceCreation);
			return res.status(400).json({
				message: `Vui lòng chờ ${waitTime} phút trước khi gửi lại`,
				waitSeconds: waitTime * 60
			});
		}

		// ✅ Generate new OTP
		const otp = generateOTP();
		const otpHash = await hashOTP(otp);

		// ✅ Update expiration time (2 minutes from now)
		const newExpireAt = new Date();
		newExpireAt.setMinutes(newExpireAt.getMinutes() + 2);

		// ✅ Update verification record
		verification.otpHash = otpHash;
		verification.attempts = 0; // Reset attempts
		verification.resendCount = (verification.resendCount || 0) + 1;
		verification.lastResendTime = now;
		verification.expireAt = newExpireAt;
		await verification.save();

		// ✅ Send OTP email
		try {
			await sendOTPEmail(emailLower, otp);
		} catch (emailErr) {
			console.error('[OTP RESEND] Email sending failed:', emailErr.message);
			return res.status(500).json({ message: 'Không thể gửi email OTP. Vui lòng thử lại.' });
		}

		console.log('[OTP RESEND] ✅ OTP resent to:', emailLower, '- Resend count:', verification.resendCount);

		res.json({
			message: 'Mã OTP mới đã được gửi đến email của bạn',
			expireAt: newExpireAt.toISOString(),
			resendCount: verification.resendCount
		});

	} catch (err) {
		console.error('[OTP RESEND] Error:', err.message);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

module.exports = router;
