const express = require('express');
const router = express.Router();
const Payment = require('../models/payment');
const License = require('../models/license');
const Client = require('../models/client');
const crypto = require('crypto');
require('dotenv').config();

const { PayOS } = require('@payos/node');
const payos = new PayOS(
	process.env.PAYOS_CLIENT_ID,
	process.env.PAYOS_API_KEY,
	process.env.PAYOS_CHECKSUM_KEY
);

// ========= Helpers =========

function generateSignature(data, checksumKey) {
	const sortedKeys = ['amount', 'cancelUrl', 'description', 'orderCode', 'returnUrl'];
	const signatureString = sortedKeys
		.map(key => `${key}=${data[key]}`)
		.join('&');
	return crypto.createHmac('sha256', checksumKey).update(signatureString).digest('hex');
}

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
		return `SNTL-${randBlock(4)}-${randBlock(4)}`;
	} else {
		let hexStr = "";
		for (let i = 0; i < 10; i++) {
			hexStr += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
		}
		return `PRO-${hexStr.slice(0,4)}-${hexStr.slice(4,8)}-${hexStr.slice(8,12)}-${hexStr.slice(12,16)}`.toUpperCase();
	}
}

function getExpiresDate(days = 30) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function generateOrderCode() {
	return Math.floor(Math.random() * 999999999) + 1000000000;
}

// ========= POST /create =========

router.post('/create', async (req, res) => {
	try {
		const { plan } = req.body;
		const clientId = req.session.userId;

		const planConfig = { PREMIUM: 75000, PRO: 500000 };
		const amount = planConfig[plan] || 75000;

		// Tạo orderCode TRƯỚC rồi mới lưu vào Payment
		const orderCode = Number(Date.now().toString().slice(-8));

		const payment = await Payment.create({
			clientId,
			plan,
			amount,
			method: 'PayOS',
			status: 'pending',
			orderCode,
			transactionId: String(generateOrderCode())
		});

		const client = await Client.findById(clientId);

		const paymentData = {
			orderCode,
			amount,
			description: `Mua goi ${plan}`,
			cancelUrl: `${process.env.FRONTEND_URL}/payment.html?status=cancelled&id=${payment._id}`,
			returnUrl:  `${process.env.FRONTEND_URL}/payment.html?status=success&id=${payment._id}`,
		};

		const signature = generateSignature(paymentData, process.env.PAYOS_CHECKSUM_KEY);

		const payload = {
			...paymentData,
			buyerEmail: client.email,
			signature,
		};

		const response = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-client-id': process.env.PAYOS_CLIENT_ID,
				'x-api-key':   process.env.PAYOS_API_KEY,
			},
			body: JSON.stringify(payload),
		});

		const result = await response.json();
		console.log('PayOS response:', JSON.stringify(result));

		if (result.code !== '00') {
			throw new Error(result.desc || 'Lỗi PayOS');
		}

		res.json({
			success: true,
			paymentId:   payment._id,
			checkoutUrl: result.data.checkoutUrl,
			qrCode:      result.data.qrCode,
		});

	} catch (err) {
		console.error('Error creating PayOS payment:', err.message);
		res.status(500).json({ success: false, message: 'Lỗi tạo thanh toán' });
	}
});

// ========= POST /return =========

router.post('/return', async (req, res) => {
	try {
		const { paymentId } = req.body;
		const clientId = req.session.userId;

		// Tìm Payment record
		const payment = await Payment.findById(paymentId);
		if (!payment) {
			return res.status(404).json({ success: false, message: 'Thanh toán không tìm thấy' });
		}

		// Nếu đã xác nhận trước đó → trả license luôn
		if (payment.status === 'success') {
			const license = await License.findOne({
				clientId,
				expiresAt: { $gt: new Date() }
			}).sort({ createdAt: -1 });

			return res.json({
				success: true,
				message: 'Thanh toán đã được xác nhận',
				license: license ? {
					key:       license.key,
					plan:      license.plan,
					expiresAt: license.expiresAt
				} : null
			});
		}

		// Gọi PayOS REST API để xác nhận trạng thái
		try {
			const verifyRes = await fetch(
				`https://api-merchant.payos.vn/v2/payment-requests/${payment.orderCode}`,
				{
					method: 'GET',
					headers: {
						'x-client-id': process.env.PAYOS_CLIENT_ID,
						'x-api-key':   process.env.PAYOS_API_KEY,
					}
				}
			);
			const verifyData = await verifyRes.json();
			console.log('Verify response:', JSON.stringify(verifyData));

			// Chưa thanh toán
			if (!verifyData.data || verifyData.data.status !== 'PAID') {
				await Payment.findByIdAndUpdate(paymentId, { status: 'failed' });
				return res.json({ success: false, message: 'Thanh toán chưa được hoàn tất' });
			}

			// Thanh toán thành công → cập nhật Payment
			await Payment.findByIdAndUpdate(paymentId, {
				status:        'success',
				transactionId: verifyData.data.id || String(payment.orderCode)
			});

			// Tạo License Key
			const licenseKey = genKey(payment.plan);
			const expiresAt  = getExpiresDate(30);

			await License.create({
				clientId,
				key:       licenseKey,
				plan:      payment.plan,
				amount:    payment.amount,
				expiresAt,
			});

			return res.json({
				success: true,
				message: 'Thanh toán thành công',
				license: {
					key:       licenseKey,
					plan:      payment.plan,
					expiresAt,
				}
			});

		} catch (payosError) {
			console.error("PayOS verification error:", payosError);
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

// ========= GET /license/active =========

router.get('/license/active', async (req, res) => {
	try {
		const clientId = req.session.userId;
		const license = await License.findOne({
			clientId,
			expiresAt: { $gt: new Date() }
		}).sort({ createdAt: -1 });

		if (!license) {
			return res.json({ success: false, message: 'Chưa có license' });
		}

		res.json({
			success: true,
			license: {
				key:       license.key,
				plan:      license.plan,
				expiresAt: license.expiresAt
			}
		});
	} catch (err) {
		console.error("Error fetching license:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});

// ========= GET / (lịch sử thanh toán) =========

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

module.exports = router;