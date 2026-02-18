const express = require('express');
const router = express.Router();
const SupportMsg = require('../models/supportMsg');

// Gửi tin nhắn hỗ trợ
router.post('/', async (req, res) => {
	const { message } = req.body;
	try {
		const supportMsg = await SupportMsg.create({ client: req.user._id, email: req.user.email, message });
		res.json({ message: 'Đã gửi hỗ trợ', supportMsg });
	} catch (err) {
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Lấy tin nhắn hỗ trợ của user
router.get('/', async (req, res) => {
	try {
		const msgs = await SupportMsg.find({ client: req.user._id });
		res.json(msgs);
	} catch (err) {
		res.status(500).json({ message: 'Lỗi server' });
	}
});

module.exports = router;
