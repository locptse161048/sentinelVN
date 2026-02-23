const express = require('express');
const router = express.Router();
const SupportMsg = require('../models/supportMsg');
const Client = require('../models/client');

// Gửi tin nhắn hỗ trợ
router.post('/', async (req, res) => {
	const { subject, message } = req.body;
	try {
		const user = await Client.findById(req.session.userId);
		if (!user) {
			return res.status(404).json({ message: 'User không tồn tại' });
		}
		const supportMsg = await SupportMsg.create({ 
			client: req.session.userId, 
			email: user.email, 
			subject: subject || 'Không có tiêu đề',
			message 
		});
		res.json({ message: 'Đã gửi hỗ trợ', supportMsg });
	} catch (err) {
		console.error("Error creating support message:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Lấy tin nhắn hỗ trợ của user
router.get('/', async (req, res) => {
	try {
		const msgs = await SupportMsg.find({ client: req.session.userId });
		res.json(msgs);
	} catch (err) {
		console.error("Error fetching support messages:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

module.exports = router;
