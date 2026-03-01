const express = require('express');
const router = express.Router();
const Payment = require('../models/payment');
const License = require('../models/license');
const Client = require('../models/client');
const crypto = require('crypto');
require('dotenv').config();
const { PayOS } = require('@payos/node');
// Khởi tạo PayOS client
const payos = new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

// Helper: Tạo License Key (match logic từ index.js)
function genKey(plan = 'PREMIUM') {
	function randBlock(len) {
		const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		let out = "";
		for (let i = 0; i < len; i++) {
			out += alphabet[Math.floor(Math.random() * alphabet.length)];
		}
		return out;
	}
	if (plan === 'PREMIUM') {
		const part1 = randBlock(4);
		const part2 = randBlock(4);
		return `SNTL-${part1}-${part2}`.toUpperCase();
	} else {
		let hexStr = "";
		for (let i = 0; i < 10; i++) {
			hexStr += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
		}
		return `PRO-${hexStr.slice(0, 4)}-${hexStr.slice(4, 8)}-${hexStr.slice(8, 12)}-${hexStr.slice(12, 16)}`.toUpperCase();
	}
}

// Helper: Calculate expiresAt (30 ngày từ bây giờ)
function getExpiresDate(days = 30) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// POST: Khởi tạo thanh toán
router.post('/create', async (req, res) => {
	try {
		const { plan } = req.body;
		const clientId = req.session.userId;

		// Xác định amount theo plan
		const planConfig = {
			PREMIUM: 75000,
			PRO: 500000 // VD
		};

		const amount = planConfig[plan] || 75000;

		// Tạo Payment record với status pending
		const payment = await Payment.create({
			clientId,
			plan,
			amount,
			method: 'PayOS',
			status: 'pending',
			transactionId: generateOrderCode()
		});

		// Tạo PayOS payment request
		const paymentData = {
			orderCode: Number(payment._id.toString().slice(-8)), // lấy 8 chữ số cuối của ObjectId
			amount: amount,
			description: `Mua Premium ${plan}`,
			buyerEmail: (await Client.findById(clientId)).email,
			cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment.html?status=cancelled&id=${payment._id}`,
			returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment.html?status=success&id=${payment._id}`
		};

		// Gọi PayOS API
		const createdPayment = await payos.paymentRequests.create(paymentData);

		res.json({
			success: true,
			paymentId: payment._id,
			checkoutUrl: createdPayment.checkoutUrl,
			qrCode: createdPayment.qrCode
		});
	} catch (err) {
		console.error("Error creating PayOS payment:", err);
		res.status(500).json({ success: false, message: 'Lỗi tạo thanh toán' });
	}
});

// GET: Lấy license key hiện tại
router.get('/license/active', async (req, res) => {
	try {
		const clientId = req.session.userId;
		const license = await License.findOne({
			clientId,
			expiresAt: { $gt: new Date() } // Chưa hết hạn
		}).sort({ createdAt: -1 });

		if (!license) {
			return res.json({ success: false, message: 'Chưa có license' });
		}

		res.json({
			success: true,
			license: {
				key: license.key,
				plan: license.plan,
				expiresAt: license.expiresAt
			}
		});
	} catch (err) {
		console.error("Error fetching license:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// POST: Xử lý callback từ PayOS (verify + tạo license)
router.post('/return', async (req, res) => {
	try {
		const { paymentId } = req.body;
		const clientId = req.session.userId;

		// Tìm Payment record
		const payment = await Payment.findById(paymentId);
		if (!payment) {
			return res.status(404).json({ success: false, message: 'Thanh toán không tìm thấy' });
		}

		// Nếu đã được xác nhận trước đó
		if (payment.status === 'success') {
			const license = await License.findOne({
				clientId: clientId,
				expiresAt: { $gt: new Date() }
			}).sort({ createdAt: -1 });

			return res.json({
				success: true,
				message: 'Thanh toán đã được xác nhận',
				license: license ? {
					key: license.key,
					plan: license.plan,
					expiresAt: license.expiresAt
				} : null
			});
		}

		// Xác nhận với PayOS
		try {
			const paymentInfo = await payos.getPaymentLinkInformation(paymentId);
			
			// Kiểm tra trạng thái thanh toán từ PayOS
			if (!paymentInfo || paymentInfo.status !== 'PAID') {
				await Payment.findByIdAndUpdate(paymentId, { status: 'failed' });
				return res.json({ success: false, message: 'Thanh toán chưa được hoàn tất' });
			}

			// Cập nhật Payment status thành success
			await Payment.findByIdAndUpdate(paymentId, { 
				status: 'success',
				transactionId: paymentInfo.id
			});

			// Tạo License Key
			const licenseKey = genKey(payment.plan);
			const expiresAt = getExpiresDate(30); // Premium: 30 ngày

			// Tạo License record
			const license = await License.create({
				id: new Date().getTime().toString(), // unique id
				clientId: clientId,
				key: licenseKey,
				plan: payment.plan,
				ammount: payment.amount,
				createdAt: new Date(),
				expiresAt: expiresAt
			});

			return res.json({
				success: true,
				message: 'Thanh toán thành công',
				license: {
					key: licenseKey,
					plan: payment.plan,
					expiresAt: expiresAt
				}
			});

		} catch (payosError) {
			console.error("PayOS verification error:", payosError);
			// Nếu không thể xác nhận với PayOS, giả định rằng nó đã thành công
			// (có thể là timeout hoặc lỗi mạng)
			await Payment.findByIdAndUpdate(paymentId, { status: 'pending' });
			return res.status(502).json({ 
				success: false, 
				message: 'Không thể xác nhận với PayOS. Vui lòng thử lại sau vài giây.' 
			});
		}

	} catch (err) {
		console.error("Error processing payment return:", err);
		res.status(500).json({ success: false, message: 'Lỗi xử lý thanh toán' });
	}
});

// GET: Lấy lịch sử thanh toán
router.get('/', async (req, res) => {
	try {
		const clientId = req.session.userId;
		const payments = await Payment.find({ clientId }).sort({ createdAt: -1 });
		res.json(payments);
	} catch (err) {
		console.error("Error fetching payments:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// Helper: Generate order code
function generateOrderCode() {
	return Math.floor(Math.random() * 999999999) + 1000000000;
}

module.exports = router;