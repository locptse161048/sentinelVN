const express = require('express');
const router = express.Router();
const Payment = require('../models/payment');

// Tạo payment mới
router.post('/', async (req, res) => {
	const { amount, description } = req.body;
	try {
		const payment = await Payment.create({ client: req.user._id, amount, description });
		res.json(payment);
	} catch (err) {
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Lấy lịch sử chi tiêu
router.get('/', async (req, res) => {
	try {
		const payments = await Payment.find({ client: req.user._id }).sort({ date: -1 });
		res.json(payments);
	} catch (err) {
		res.status(500).json({ message: 'Lỗi server' });
	}
});

module.exports = router;
