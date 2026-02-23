const express = require('express');
const router = express.Router();
const Payment = require('../models/payment');

// Tạo payment mới
router.post('/', async (req, res) => {
	const { amount, description, plan, status } = req.body;
	try {
		const payment = await Payment.create({ 
			client: req.session.userId, 
			amount, 
			description,
			plan: plan || 'PREMIUM',
			status: status || 'pending',
			date: new Date()
		});
		res.json(payment);
	} catch (err) {
		console.error("Error creating payment:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Lấy lịch sử chi tiêu
router.get('/', async (req, res) => {
	try {
		const payments = await Payment.find({ client: req.session.userId }).sort({ date: -1 });
		res.json(payments);
	} catch (err) {
		console.error("Error fetching payments:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

module.exports = router;
