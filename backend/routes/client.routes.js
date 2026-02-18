const express = require('express');
const router = express.Router();
const Client = require('../models/client');
const License = require('../models/license');
const Payment = require('../models/payment');
const SupportMsg = require('../models/supportMsg');

// Lấy thông tin tài khoản
router.get('/account', async (req, res) => {
	res.json(req.user);
});

// Lấy gói đã đăng ký
router.get('/license', async (req, res) => {
	try {
		const license = await License.findOne({ client: req.user._id, status: 'active' });
		res.json(license || { message: 'Chưa đăng ký gói nào.' });
	} catch (err) {
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Lấy lịch sử chi tiêu
router.get('/payments', async (req, res) => {
	try {
		const payments = await Payment.find({ client: req.user._id }).sort({ date: -1 });
		res.json(payments);
	} catch (err) {
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Gửi tin nhắn hỗ trợ
router.post('/support', async (req, res) => {
	const { message } = req.body;
	try {
		const supportMsg = await SupportMsg.create({ client: req.user._id, email: req.user.email, message });
		res.json({ message: 'Đã gửi hỗ trợ', supportMsg });
	} catch (err) {
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Xem tin đã gửi
router.get('/support', async (req, res) => {
	try {
		const msgs = await SupportMsg.find({ client: req.user._id });
		res.json(msgs);
	} catch (err) {
		res.status(500).json({ message: 'Lỗi server' });
	}
});

module.exports = router;
