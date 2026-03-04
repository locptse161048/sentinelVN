const express = require('express');
const router = express.Router();
const Client = require('../models/client');
const SupportMsg = require('../models/supportMsg');

// Lấy danh sách tất cả clients
router.get('/clients', async (req, res) => {
	try {
		const License = require('../models/license');
		const clients = await Client.find({ role: 'client' }).select('-passwordHash');
		
		// Thêm thông tin license cho mỗi client
		const clientsWithLicense = await Promise.all(clients.map(async (client) => {
			const license = await License.findOne({ clientId: client._id });
			const clientObj = client.toObject();
			if (license) {
				clientObj.licenseKey = license.key;
				clientObj.licenseStatus = license.status;
				clientObj.plan = license.plan;
				clientObj.licenseCreatedAt = license.createdAt;
				clientObj.licenseExpiresAt = license.expiresAt;
			}
			return clientObj;
		}));
		
		res.json(clientsWithLicense);
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

// ========= CLIENT MANAGEMENT =========

// Xóa client
router.delete('/client/:clientId', async (req, res) => {
	try {
		const client = await Client.findByIdAndDelete(req.params.clientId);
		if (!client) {
			return res.status(404).json({ message: 'Client không tồn tại' });
		}
		res.json({ message: 'Đã xóa client', client });
	} catch (err) {
		console.error("Error deleting client:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Đổi gói (Free → PREMIUM → PRO → Free)
router.patch('/client/:clientId/toggle-plan', async (req, res) => {
	try {
		const client = await Client.findById(req.params.clientId);
		if (!client) {
			return res.status(404).json({ message: 'Client không tồn tại' });
		}

		const plans = ['Free', 'PREMIUM', 'PRO'];
		const currentIndex = plans.indexOf(client.plan || 'Free');
		const nextIndex = (currentIndex + 1) % plans.length;
		client.plan = plans[nextIndex];

		await client.save();
		res.json({ message: 'Đã đổi gói', client });
	} catch (err) {
		console.error("Error toggling plan:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Gia hạn 30 ngày
router.patch('/client/:clientId/extend', async (req, res) => {
	try {
		const License = require('../models/license');
		const client = await Client.findById(req.params.clientId);
		if (!client) {
			return res.status(404).json({ message: 'Client không tồn tại' });
		}

		// Gia hạn tất cả các license active của client
		const licenses = await License.find({ clientId: req.params.clientId, status: 'active' });
		const updatedLicenses = [];

		for (let lic of licenses) {
			const newExpiresAt = new Date(lic.expiresAt.getTime() + 30 * 24 * 60 * 60 * 1000);
			lic.expiresAt = newExpiresAt;
			await lic.save();
			updatedLicenses.push(lic);
		}

		res.json({ message: 'Đã gia hạn thêm 30 ngày', licenses: updatedLicenses });
	} catch (err) {
		console.error("Error extending license:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Đổi trạng thái (đang hoạt động ↔ tạm ngưng)
router.patch('/client/:clientId/toggle-status', async (req, res) => {
	try {
		const client = await Client.findById(req.params.clientId);
		if (!client) {
			return res.status(404).json({ message: 'Client không tồn tại' });
		}

		const License = require('../models/license');
		const newStatus = client.status === 'đang hoạt động' ? 'tạm ngưng' : 'đang hoạt động';
		client.status = newStatus;
		await client.save();

		// Đồng bộ trạng thái license
		let licenseStatus = 'active';
		if (newStatus === 'tạm ngưng') licenseStatus = 'tạm ngưng';
		await License.updateMany({ clientId: client._id }, { status: licenseStatus });

		res.json({ message: 'Đã đổi trạng thái', client });
	} catch (err) {
		console.error("Error toggling status:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

module.exports = router;
