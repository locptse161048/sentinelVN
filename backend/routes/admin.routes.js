const express = require('express');
const router = express.Router();
const Client = require('../models/client');
const SupportMsg = require('../models/supportMsg');

// Tìm kiếm tài khoản theo email
router.get('/search-client', async (req, res) => {
	const { email } = req.query;
	try {
		const clients = await Client.find(email ? { email: { $regex: email, $options: 'i' } } : {});
		res.json(clients);
	} catch (err) {
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Tìm kiếm tin nhắn hỗ trợ theo email
router.get('/search-support', async (req, res) => {
	const { email } = req.query;
	try {
		const msgs = await SupportMsg.find(email ? { email: { $regex: email, $options: 'i' } } : {});
		res.json(msgs);
	} catch (err) {
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Cập nhật trạng thái tin nhắn hỗ trợ
router.patch('/support/:id', async (req, res) => {
	const { status } = req.body;
	try {
		const msg = await SupportMsg.findByIdAndUpdate(req.params.id, { status }, { new: true });
		res.json(msg);
	} catch (err) {
		res.status(500).json({ message: 'Lỗi server' });
	}
});

module.exports = router;
