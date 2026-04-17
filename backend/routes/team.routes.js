const express = require('express');
const router = express.Router();
const Client = require('../models/client');
const License = require('../models/license');
const Payment = require('../models/payment');
const AuditLog = require('../models/auditLog');

// ========= GET LICENSES FOR TEAM LEADER =========
router.get('/licenses', async (req, res) => {
	try {
		const teamLeaderId = req.user._id;
		
		// Get all licenses for this team leader
		const licenses = await License.find({ clientId: teamLeaderId }).sort({ createdAt: -1 });
		
		// Format the response
		const formattedLicenses = licenses.map(license => ({
			_id: license._id,
			key: license.key,
			plan: license.plan,
			maxMembers: license.amount, // Assuming amount represents max members
			status: license.isExpired ? 'expired' : license.status,
			createdAt: license.createdAt,
			expiresAt: license.expiresAt
		}));
		
		res.json({ success: true, data: formattedLicenses });
	} catch (err) {
		console.error('[TEAM] Error fetching licenses:', err.message);
		res.status(500).json({ success: false, message: 'Lỗi server' });
	}
});

// ========= GET TEAM MEMBERS =========
router.get('/members', async (req, res) => {
	try {
		const teamLeaderId = req.user._id;
		
		// Get all team members: assigned to this leader OR unassigned (chưa gán)
		const members = await Client.find({
			role: 'teamMember',
			$or: [
				{ teamLeaderId: teamLeaderId },  // Assigned to this leader
				{ teamLeaderId: null }            // Unassigned members
			]
		})
			.select('-passwordHash')
			.sort({ createdAt: -1 });
		
		const formattedMembers = members.map(member => ({
			_id: member._id,
			email: member.email,
			firstName: member.firstName || '-',
			lastName: member.lastName || '-',
			gender: member.gender || '-',
			dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString('vi-VN') : '-',
			phone: member.phone || '-',
			status: member.status,
			isAssigned: member.teamLeaderId ? true : false,  // Đã gán hay chưa gán
			createdAt: member.createdAt
		}));
		
		res.json({ success: true, data: formattedMembers });
	} catch (err) {
		console.error('[TEAM] Error fetching members:', err.message);
		res.status(500).json({ success: false, message: 'Lỗi server' });
	}
});

// ========= GET AUDIT LOGS =========
router.get('/audit-logs', async (req, res) => {
	try {
		const teamLeaderId = req.user._id;
		
		// Get all audit logs for this team leader, sorted by newest first
		const auditLogs = await AuditLog.find({ teamLeaderId: teamLeaderId })
			.sort({ createdAt: -1 })
			.limit(500);
		
		const formattedLogs = auditLogs.map(log => ({
			_id: log._id,
			time: new Date(log.createdAt).toLocaleString('vi-VN'),
			email: log.email,
			file: log.file,
			action: log.action,
			createdAt: log.createdAt
		}));
		
		res.json({ success: true, data: formattedLogs });
	} catch (err) {
		console.error('[TEAM] Error fetching audit logs:', err.message);
		res.status(500).json({ success: false, message: 'Lỗi server' });
	}
});

// ========= GET PAYMENTS =========
router.get('/payments', async (req, res) => {
	try {
		const teamLeaderId = req.user._id;
		
		// Get all payments for this team leader
		const payments = await Payment.find({ clientId: teamLeaderId }).sort({ createdAt: -1 });
		
		const formattedPayments = payments.map(payment => ({
			_id: payment._id,
			plan: payment.plan,
			amount: payment.amount,
			method: payment.method,
			status: payment.status,
			orderCode: payment.orderCode || '-',
			transactionId: payment.transactionId || '-',
			createdAt: new Date(payment.createdAt).toLocaleString('vi-VN')
		}));
		
		res.json({ success: true, data: formattedPayments });
	} catch (err) {
		console.error('[TEAM] Error fetching payments:', err.message);
		res.status(500).json({ success: false, message: 'Lỗi server' });
	}
});

// ========= ADD TEAM MEMBER =========
router.post('/members', async (req, res) => {
	try {
		const teamLeaderId = req.user._id;
		const { email } = req.body;
		
		if (!email) {
			return res.status(400).json({ success: false, message: 'Email là bắt buộc' });
		}
		
		// Check if user exists
		const member = await Client.findOne({ email: email.toLowerCase() });
		if (!member) {
			return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
		}
		
		// Assign team leader to this member
		member.teamLeaderId = teamLeaderId;
		member.role = 'teamMember';
		await member.save();
		
		res.json({ success: true, message: 'Thêm thành viên thành công' });
	} catch (err) {
		console.error('[TEAM] Error adding member:', err.message);
		res.status(500).json({ success: false, message: 'Lỗi server' });
	}
});

// ========= REMOVE TEAM MEMBER =========
router.delete('/members/:memberId', async (req, res) => {
	try {
		const teamLeaderId = req.user._id;
		const { memberId } = req.params;
		
		// Check if member belongs to this team leader
		const member = await Client.findOne({ _id: memberId, teamLeaderId: teamLeaderId });
		if (!member) {
			return res.status(404).json({ success: false, message: 'Thành viên không tồn tại' });
		}
		
		// Remove team leader reference
		member.teamLeaderId = null;
		member.role = 'client';
		await member.save();
		
		res.json({ success: true, message: 'Xóa thành viên thành công' });
	} catch (err) {
		console.error('[TEAM] Error removing member:', err.message);
		res.status(500).json({ success: false, message: 'Lỗi server' });
	}
});

module.exports = router;
