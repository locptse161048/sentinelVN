const express = require('express');
const router = express.Router();
const Client = require('../models/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

// Đăng ký
router.post('/register', getMiddleware, async (req, res) => {
	const { email, password, fullName, gender, phone, address } = req.body;
	
	// ⚠️ SECURITY: Input validation
	if (!fullName || fullName.trim().length === 0) {
		return res.status(400).json({ message: "Vui lòng nhập họ và tên" });
	}
	if (fullName.length > 100) {
		return res.status(400).json({ message: "Họ và tên quá dài (max 100 ký tự)" });
	}
	
	if (!email || !isValidEmail(email)) {
		return res.status(400).json({ message: "Email không hợp lệ" });
	}
	
	const passValidation = validatePassword(password);
	if (!passValidation.valid) {
		return res.status(400).json({ message: passValidation.message });
	}
	
	if (phone && !/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
		return res.status(400).json({ message: "Số điện thoại không hợp lệ (10 chữ số)" });
	}
	
	if (address && address.length > 200) {
		return res.status(400).json({ message: "Địa chỉ quá dài (max 200 ký tự)" });
	}
	
	if (gender && !['nam', 'nữ', 'khác'].includes(gender)) {
		return res.status(400).json({ message: "Giới tính không hợp lệ" });
	}
	
	try {
		const existing = await Client.findOne({ email: email.toLowerCase() });
		if (existing) return res.status(400).json({ message: 'Email đã tồn tại' });
		
		const hash = await bcrypt.hash(password, 10);
		const user = await Client.create({
			email: email.toLowerCase(),
			fullName: fullName.trim(),
			gender: gender || null,
			phone: phone ? phone.replace(/\D/g, '') : null,
			address: address ? address.trim() : null,
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
				gender: user.gender || '-',
				phone: user.phone || '-',
				address: user.address || '-',
				status: user.status,
				createdAt: user.createdAt,
				licenseStatus: 'pending',
				licenseKey: '-',
				plan: '-'
			});
			console.log('[SOCKET] Emitted new_client_registered event');
		}
		
		res.json({ message: 'Đăng ký thành công', user: { email: user.email, fullName: user.fullName } });
	} catch (err) {
		// ⚠️ SECURITY: Don't log sensitive errors
		console.error('[AUTH REGISTER] Error:', err.message);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Đăng nhập
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

		const match = await bcrypt.compare(password, user.passwordHash);
		if (!match) return res.status(400).json({ message: 'Sai email hoặc mật khẩu' });
		
		req.session.userId = user._id;
		console.log("[AUTH LOGIN] Session userId set:", req.session.userId);
		console.log("[AUTH LOGIN] User role:", user.role);

		req.session.save(err => {
			if (err) {
				console.error("[AUTH LOGIN] Session save error:", err);
				return res.status(500).json({ message: "Session error" });
			}
			console.log("[AUTH LOGIN] Session saved successfully to MongoDB");
			res.json({
				message: "Đăng nhập thành công",
				user: {
					email: user.email,
					role: user.role,
					fullName: user.fullName
				}
			});
		});
	} catch (err) {
		console.error("[AUTH LOGIN] Server error:", err);
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

// Kiểm tra session
router.get('/session', async (req, res) => {
	console.log("[AUTH SESSION] Checking session...");
	console.log("[AUTH SESSION] req.session:", req.session);
	console.log("[AUTH SESSION] req.sessionID:", req.sessionID);
	
	if (!req.session.userId) {
		console.log("[AUTH SESSION] No userId in session, returning 401");
		return res.status(401).json({ message: "Chưa đăng nhập" });
	}
	
	const user = await Client.findById(req.session.userId);
	if (!user) {
		console.log("[AUTH SESSION] User not found in DB, returning 401");
		return res.status(401).json({ message: "User không tồn tại" });
	}
	
	console.log("[AUTH SESSION] User found:", user.email, "Role:", user.role);
	res.json({
		email: user.email,
		role: user.role,
		fullName: user.fullName,
		gender: user.gender,
		phone: user.phone,
		address: user.address
	});
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


module.exports = router;
