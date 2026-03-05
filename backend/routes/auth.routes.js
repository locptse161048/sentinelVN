const express = require('express');
const router = express.Router();
const Client = require('../models/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Đăng ký
router.post('/register', async (req, res) => {
	const { email, password, fullName, gender, phone, address } = req.body;
	if (!fullName) {
		return res.status(400).json({ message: "Vui lòng nhập họ và tên" });
	}
	try {
		const existing = await Client.findOne({ email });
		if (existing) return res.status(400).json({ message: 'Email đã tồn tại' });
		const hash = await bcrypt.hash(password, 10);
		const user = await Client.create({
			email,
			fullName: fullName || "",
			gender: gender || null,
			phone: phone || null,
			address: address || null,
			passwordHash: hash,
			role: 'client',
			status: 'đang hoạt động'
		});
		res.json({ message: 'Đăng ký thành công', user });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Đăng nhập
router.post('/login', async (req, res) => {
	const { email, password } = req.body;
	try {
		const user = await Client.findOne({ email });
		if (!user) return res.status(400).json({ message: 'Sai email hoặc mật khẩu' });

		const match = await bcrypt.compare(password, user.passwordHash);
		if (!match) return res.status(400).json({ message: 'Sai email hoặc mật khẩu' });
		req.session.userId = user._id;
		console.log("[AUTH LOGIN] 🔐 Session set - UserId:", req.session.userId);

		req.session.save(err => {
			if (err) {
				console.error("[AUTH LOGIN] ❌ Session save error:", err);
				return res.status(500).json({ message: "Session error" });
			}
			console.log("[AUTH LOGIN] ✅ Session saved successfully, Cookie:", req.session);
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
	console.log("[AUTH SESSION] Checking session - UserId:", req.session?.userId);
	
	if (!req.session.userId) {
		console.warn("[AUTH SESSION] ❌ No userId in session");
		return res.status(401).json({ message: "Chưa đăng nhập" });
	}
	
	const user = await Client.findById(req.session.userId);
	if (!user) {
		console.warn("[AUTH SESSION] ❌ User not found for userId:", req.session.userId);
		return res.status(401).json({ message: "User không tồn tại" });
	}
	
	console.log("[AUTH SESSION] ✅ Session valid for user:", user.email);
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
