const express = require('express');
const router = express.Router();
const Client = require('../models/client');
const SupportMsg = require('../models/supportMsg');

// ⚠️ SECURITY: Escape special regex characters to prevent NoSQL injection
function escapeRegex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
		// ⚠️ SECURITY: Don't expose sensitive error details
		console.error("[ADMIN] Error fetching clients");
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Tìm kiếm tài khoản theo email - ⚠️ SECURITY: Escape regex input
router.get('/search-client', async (req, res) => {
	const { email } = req.query;
	try {
		// Escape email input to prevent regex injection
		const escapedEmail = email ? escapeRegex(email) : '';
		const clients = await Client.find(
			email ? { email: { $regex: escapedEmail, $options: 'i' } } : {}
		).select('-passwordHash');
		
		res.json(clients);
	} catch (err) {
		console.error("[ADMIN] Error searching clients");
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Lấy tất cả tin nhắn hỗ trợ
router.get('/support', async (req, res) => {
	try {
		const msgs = await SupportMsg.find().sort({ createdAt: -1 });
		res.json(msgs);
	} catch (err) {
		console.error("[ADMIN] Error fetching support messages");
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Tìm kiếm tin nhắn hỗ trợ theo email - ⚠️ SECURITY: Escape regex input
router.get('/search-support', async (req, res) => {
	const { email } = req.query;
	try {
		// Escape email input to prevent regex injection
		const escapedEmail = email ? escapeRegex(email) : '';
		const msgs = await SupportMsg.find(
			email ? { email: { $regex: escapedEmail, $options: 'i' } } : {}
		);
		res.json(msgs);
	} catch (err) {
		console.error("[ADMIN] Error searching support messages");
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
		console.error("[ADMIN] Error updating support message");
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
		res.json({ message: 'Đã xóa client' });
	} catch (err) {
		console.error("[ADMIN] Error deleting client");
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
		res.json({ message: 'Đã đổi gói' });
	} catch (err) {
		console.error("[ADMIN] Error toggling plan");
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
		console.error("[ADMIN] Error extending license");
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

// ========= STATISTICS =========

// GET /api/admin/stats — Tổng hợp thống kê cho admin dashboard
router.get('/stats', async (req, res) => {
	try {
		const Payment = require('../models/payment');
		const License = require('../models/license');
		const now = new Date();
		const currentYear = now.getFullYear();

		// ── MONTHLY: 12 tháng gần nhất ──────────────────────────────────────
		const monthlyRevenue = await Payment.aggregate([
			{ $match: { status: 'success' } },
			{
				$group: {
					_id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
					revenue: { $sum: '$amount' }
				}
			}
		]);

		const monthlyNewUsers = await Client.aggregate([
			{ $match: { role: 'client' } },
			{
				$group: {
					_id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
					count: { $sum: 1 }
				}
			}
		]);

		const monthlyNewLicenses = await License.aggregate([
			{
				$group: {
					_id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, plan: '$plan' },
					count: { $sum: 1 }
				}
			}
		]);

		// Tạo map tra cứu nhanh
		const revenueMap = {};
		monthlyRevenue.forEach(r => { revenueMap[`${r._id.year}-${r._id.month}`] = r.revenue; });

		const userMap = {};
		monthlyNewUsers.forEach(u => { userMap[`${u._id.year}-${u._id.month}`] = u.count; });

		const licenseMap = {};
		monthlyNewLicenses.forEach(l => {
			const key = `${l._id.year}-${l._id.month}`;
			if (!licenseMap[key]) licenseMap[key] = { PREMIUM: 0, PRO: 0 };
			licenseMap[key][l._id.plan] = l.count;
		});

		// Sinh 12 tháng gần nhất
		const monthly = [];
		for (let i = 11; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const y = d.getFullYear();
			const m = d.getMonth() + 1;
			const key = `${y}-${m}`;
			monthly.push({
				label: `${String(m).padStart(2, '0')}/${y}`,
				year: y,
				month: m,
				revenue: revenueMap[key] || 0,
				newUsers: userMap[key] || 0,
				newPremium: licenseMap[key]?.PREMIUM || 0,
				newPro: licenseMap[key]?.PRO || 0,
			});
		}

		// ── QUARTERLY: 4 quý của năm hiện tại ──────────────────────────────
		const quarterly = [1, 2, 3, 4].map(q => {
			const months = [q * 3 - 2, q * 3 - 1, q * 3]; // Q1=[1,2,3], Q2=[4,5,6],...
			return {
				label: `Q${q}/${currentYear}`,
				quarter: q,
				year: currentYear,
				revenue: months.reduce((s, m) => s + (revenueMap[`${currentYear}-${m}`] || 0), 0),
				newUsers: months.reduce((s, m) => s + (userMap[`${currentYear}-${m}`] || 0), 0),
				newPremium: months.reduce((s, m) => s + (licenseMap[`${currentYear}-${m}`]?.PREMIUM || 0), 0),
				newPro: months.reduce((s, m) => s + (licenseMap[`${currentYear}-${m}`]?.PRO || 0), 0),
			};
		});

		// ── YEARLY: 5 năm gần nhất ──────────────────────────────────────────
		const yearly = [];
		for (let y = currentYear - 4; y <= currentYear; y++) {
			const months = Array.from({ length: 12 }, (_, i) => i + 1);
			yearly.push({
				label: `${y}`,
				year: y,
				revenue: months.reduce((s, m) => s + (revenueMap[`${y}-${m}`] || 0), 0),
				newUsers: months.reduce((s, m) => s + (userMap[`${y}-${m}`] || 0), 0),
				newPremium: months.reduce((s, m) => s + (licenseMap[`${y}-${m}`]?.PREMIUM || 0), 0),
				newPro: months.reduce((s, m) => s + (licenseMap[`${y}-${m}`]?.PRO || 0), 0),
			});
		}

		// ── OVERALL: Tổng quan toàn thời gian ───────────────────────────────
		const totalRevenue = await Payment.aggregate([
			{ $match: { status: 'success' } },
			{ $group: { _id: null, total: { $sum: '$amount' } } }
		]);
		const totalUsers = await Client.countDocuments({ role: 'client' });
		const totalPremiumActive = await License.countDocuments({
			plan: 'PREMIUM', status: 'active', expiresAt: { $gt: now }
		});
		const totalProActive = await License.countDocuments({
			plan: 'PRO', status: 'active', expiresAt: { $gt: now }
		});

		const overall = {
			totalRevenue: totalRevenue[0]?.total || 0,
			totalUsers,
			totalPremiumActive,
			totalProActive,
		};

		res.json({ monthly, quarterly, yearly, overall });
	} catch (err) {
		console.error('[ADMIN] Error fetching stats:', err.message);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

module.exports = router;

