const express = require('express');
const router = express.Router();
const Client = require('../models/client');
const License = require('../models/license');
const Payment = require('../models/payment');
const SupportMsg = require('../models/supportMsg');

// Lấy thông tin tài khoản hiện tại
router.get('/me', async (req, res) => {
	try {
			console.log("[BACKEND] GET /api/client/me - User ID:", req.user._id);

			const user = await Client.findById(req.user._id);
		if (!user) {
				console.error("[BACKEND] User not found with ID:", req.user._id);
			return res.status(404).json({ message: "User không tồn tại" });
		}

		console.log("[BACKEND] ✅ User found:", user.email);

		res.json({
			email: user.email,
			fullName: user.fullName,
			gender: user.gender,
			phone: user.phone,
			address: user.address,
			plan: user.plan,
			status: user.status
		});
	} catch (err) {
		console.error("[BACKEND] Error fetching user info:", err);
		res.status(500).json({ message: "Lỗi server" });
	}
});

// Lấy thông tin tài khoản (cũ - giữ cho tương thích)
router.get('/account', async (req, res) => {
	try {
		const user = await Client.findById(req.user._id);
		if (!user) {
			return res.status(404).json({ message: "User không tồn tại" });
		}
		res.json({
			email: user.email,
			fullName: user.fullName,
			gender: user.gender,
			phone: user.phone,
			address: user.address,
			plan: user.plan,
			status: user.status
		});
	} catch (err) {
		console.error("Error fetching account info:", err);
		res.status(500).json({ message: "Lỗi server" });
	}
});

// Lấy gói đã đăng ký
router.get('/license', async (req, res) => {
	try {
		const license = await License.findOne({ clientId: req.user._id, status: 'active' });
		res.json(license || { message: 'Chưa đăng ký gói nào.' });
	} catch (err) {
		console.error("Error fetching license:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Lấy lịch sử chi tiêu
router.get('/payments', async (req, res) => {
	try {
		const payments = await Payment.find({ clientId: req.user._id }).sort({ createdAt: -1 });
		res.json(payments);
	} catch (err) {
		console.error("Error fetching payments:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Gửi tin nhắn hỗ trợ
router.post('/support', async (req, res) => {
	const { title, message } = req.body;
	try {
			const user = await Client.findById(req.user._id);
			const supportMsg = await SupportMsg.create({
				client: req.user._id,
			email: user.email,
			title,
			message
		});
		res.json({ message: 'Đã gửi hỗ trợ', supportMsg });
	} catch (err) {
		console.error("Error sending support message:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Xem tin đã gửi
router.get('/support', async (req, res) => {
	try {
		const msgs = await SupportMsg.find({ client: req.user._id });
		res.json(msgs);
	} catch (err) {
		console.error("Error fetching support messages:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

module.exports = router;
