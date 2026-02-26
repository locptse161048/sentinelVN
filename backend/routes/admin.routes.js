const express = require('express');
const router = express.Router();
const Client = require('../models/client');
const SupportMsg = require('../models/supportMsg');

// Lấy danh sách tất cả clients
router.get('/clients', async (req, res) => {
	try {
		const clients = await Client.find({ role: 'client' }).select('-passwordHash');
		res.json(clients);
	} catch (err) {
		console.error("Error fetching clients:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Tìm kiếm tài khoản theo email
router.get('/search-client', async (req, res) => {
	const { email } = req.query;
	try {
		const clients = await Client.find(email ? { email: { $regex: email, $options: 'i' } } : {});
		res.json(clients);
	} catch (err) {
		console.error("Error searching clients:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Lấy tất cả tin nhắn hỗ trợ
router.get('/support', async (req, res) => {
	try {
		const msgs = await SupportMsg.find().sort({ createdAt: -1 });
		res.json(msgs);
	} catch (err) {
		console.error("Error fetching support messages:", err);
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
		console.error("Error searching support messages:", err);
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
		console.error("Error updating support message:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

module.exports = router;
