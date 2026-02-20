const express = require('express');
const router = express.Router();
const Client = require('../models/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Đăng ký
router.post('/register', async (req, res) => {
	const { email, password, fullName } = req.body;
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
			passwordHash: hash
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
		const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
		res.json({
			token,
			user: {
				email: user.email,
				role: user.isAdmin ? "admin" : "client",
				fullName: user.fullName
			}
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Lấy thông tin user
router.get('/me', async (req, res) => {
	const token = req.header('Authorization')?.replace('Bearer ', '');
	if (!token) return res.status(401).json({ message: 'No token' });
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
		const user = await Client.findById(decoded.id);
		if (!user) return res.status(404).json({ message: 'User not found' });
		res.json(user);
	} catch (err) {
		res.status(401).json({ message: 'Token invalid' });
	}
});

module.exports = router;
