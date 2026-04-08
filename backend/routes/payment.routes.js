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
		return `PRO-${hexStr.slice(0, 4)}-${hexStr.slice(4, 8)}-${hexStr.slice(8, 12)}-${hexStr.slice(12, 16)}`.toUpperCase();
	}
}
// ========= Xác thực webhook từ PayOS =========
// Cập nhật hoặc tạo license (1 client = 1 key per plan)
async function processLicense(clientId, plan, licenseId, paymentAmount, paymentCreatedAt = new Date()) {
    const now = new Date();
    
    console.log(`[PROCESS LICENSE] Finding existing license - clientId: ${clientId}, plan: ${plan}`);
    const existingLicense = await License.findOne({ clientId, plan });
    console.log(`[PROCESS LICENSE] Existing license found: ${existingLicense ? existingLicense.key : 'None'}`);

    if (!existingLicense) {
        // Tạo license mới
        console.log(`[PROCESS LICENSE] Creating new license`);
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        return await License.create({
            id: licenseId,
            clientId,
            key: genKey(plan),
            plan,
            amount: paymentAmount,
            status: 'active',
            expiresAt,
        });
    } else {
        // Đã có license → update expiresAt
        console.log(`[PROCESS LICENSE] Updating existing license - Current status: ${existingLicense.status}, expiresAt: ${existingLicense.expiresAt}`);
        let newExpiresAt;

        if (existingLicense.status === 'active') {
            // Status active → +30 ngày từ ngày hết hạn hiện tại
            console.log(`[PROCESS LICENSE] License is active - Adding 30 days to current expiresAt`);
            newExpiresAt = new Date(existingLicense.expiresAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else {
            // Status expired → +30 ngày từ ngày hiện tại
            console.log(`[PROCESS LICENSE] License is expired - Setting expiresAt to now + 30 days`);
            newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        }

        console.log(`[PROCESS LICENSE] New expiresAt: ${newExpiresAt}`);

        const updatedLicense = await License.findByIdAndUpdate(
            existingLicense._id,
            {
                expiresAt: newExpiresAt,
                status: 'active',
                amount: paymentAmount,
            },
            { new: true }
        );

        //console.log(`[PROCESS LICENSE] License updated successfully`);
        return updatedLicense;
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
		const clientId = req.user._id;

		const planConfig = { PREMIUM: 75000};
		const amount = planConfig[plan] || 75000;
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
			returnUrl: `${process.env.FRONTEND_URL}/payment.html?status=success&id=${payment._id}`,
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
				'x-api-key': process.env.PAYOS_API_KEY,
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
			paymentId: payment._id,
			checkoutUrl: result.data.checkoutUrl,
			qrCode: result.data.qrCode,
		});

	} catch (err) {
		console.error('Error creating PayOS payment:', err.message);
		res.status(500).json({ success: false, message: 'Lỗi tạo thanh toán' });
	}
});

// ========= POST /webhook =========
// PayOS tự gọi route này khi có tiền chuyển đến
// ⚠️ Route này KHÔNG cần authMiddleware → phải đặt trước module.exports

router.post('/webhook', async (req, res) => {
	try {
		const webhookData = req.body;
		console.log('Webhook received:', JSON.stringify(webhookData));

		// 1. Xác thực chữ ký
		const sortedKeys = [
			'amount', 'code', 'desc', 'orderCode', 'reference',
			'transactionDateTime', 'counterAccountBankId',
			'counterAccountBankName', 'counterAccountName',
			'counterAccountNumber', 'virtualAccountName',
			'virtualAccountNumber'
		];

		const signatureString = sortedKeys
			.filter(key => webhookData.data?.[key] !== undefined)
			.map(key => `${key}=${webhookData.data[key]}`)
			.join('&');

		const expectedSignature = crypto
			.createHmac('sha256', process.env.PAYOS_CHECKSUM_KEY)
			.update(signatureString)
			.digest('hex');

		if (webhookData.signature !== expectedSignature) {
			console.error('Invalid webhook signature');
			return res.status(400).json({ error: 'Invalid signature' });
		}

		// 2. Chỉ xử lý khi thanh toán thành công
		if (webhookData.code !== '00') {
			return res.json({ received: true });
		}

		const orderCode = webhookData.data.orderCode;

		// 3. Tìm Payment theo orderCode
		const payment = await Payment.findOne({ orderCode });
		if (!payment) {
			console.error('Payment not found for orderCode:', orderCode);
			return res.status(404).json({ error: 'Payment not found' });
		}

		// 4. Tránh xử lý trùng
		if (payment.status === 'success') {
			return res.json({ received: true, message: 'Already processed' });
		}

		// 5. Cập nhật Payment → success
		const updatedPayment = await Payment.findByIdAndUpdate(
			payment._id,
			{
				status: 'success',
				transactionId: webhookData.data.reference || String(orderCode)
			},
			{ new: true }
		);

		// 6. Xử lý License (create hoặc update)
		const license = await processLicense(
			payment.clientId,
			payment.plan,
			webhookData.data.reference || String(orderCode),
			payment.amount,
			updatedPayment.createdAt
		);

		console.log('✅ License processed via webhook:', license.key);

		// 7. Trả 200 để PayOS không retry
		return res.json({ received: true });

	} catch (err) {
		console.error('Webhook error:', err);
		return res.status(200).json({ received: true });
	}
});

// ========= POST /return (user bấm "Đã thanh toán") =========

router.post('/return', async (req, res) => {
	try {
		const { paymentId } = req.body;
		const clientId = req.user._id;

		const payment = await Payment.findById(paymentId);
		if (!payment) {
			return res.status(404).json({ success: false, message: 'Thanh toán không tìm thấy' });
		}

		// ⚠️ SECURITY: Verify payment ownership (prevent IDOR)
		if (payment.clientId.toString() !== clientId.toString()) {
			return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập thanh toán này' });
		}

		// Webhook đã xử lý xong → trả license luôn, không cần làm gì thêm
		if (payment.status === 'success') {
			const license = await License.findOne({
				clientId,
				plan: payment.plan,
				status: 'active',
				expiresAt: { $gt: new Date() }
			});

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

		// Webhook chưa kịp chạy → tự verify với PayOS (fallback)
		try {
			const verifyRes = await fetch(
				`https://api-merchant.payos.vn/v2/payment-requests/${payment.orderCode}`,
				{
					method: 'GET',
					headers: {
						'x-client-id': process.env.PAYOS_CLIENT_ID,
						'x-api-key': process.env.PAYOS_API_KEY,
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

			// Đã thanh toán → cập nhật Payment
			const updatedPayment = await Payment.findByIdAndUpdate(
				paymentId,
				{
					status: 'success',
					transactionId: verifyData.data.id || String(payment.orderCode)
				},
				{ new: true }
			);

			// Xử lý License (create hoặc update)
			const license = await processLicense(
				clientId,
				payment.plan,
				verifyData.data.id,
				payment.amount,
				updatedPayment.createdAt
			);

			return res.json({
				success: true,
				message: 'Thanh toán thành công',
				license: { key: license.key, plan: license.plan, expiresAt: license.expiresAt }
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

// ========= GET /licenses (Lấy tất cả license của client) =========
router.get('/licenses', async (req, res) => {
	try {
		const clientId = req.user._id;
		const licenses = await License.find({ clientId }).sort({ createdAt: -1 });

		if (!licenses.length) {
			return res.json({ success: false, licenses: [], message: 'Chưa có license nào' });
		}

		res.json({
			success: true,
			licenses: licenses.map(lic => ({
				key: lic.key,
				plan: lic.plan,
				amount: lic.amount,
				status: lic.status,
				createdAt: lic.createdAt,
				expiresAt: lic.expiresAt
			}))
		});
	} catch (err) {
		console.error("Error fetching licenses:", err);
		res.status(500).json({ success: false, message: 'Lỗi server' });
	}
});

// ========= GET /license/active =========

router.get('/license/active', async (req, res) => {
	try {
		const clientId = req.user._id;
		const license = await License.findOne({
			clientId,
			plan: 'PREMIUM',
			status: 'active',
			expiresAt: { $gt: new Date() }
		});

		if (!license) {
			return res.json({ success: false, message: 'Chưa có license' });
		}

		res.json({
			success: true,
			license: {
				key: license.key,
				plan: license.plan,
				status: license.status,
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
		const clientId = req.user._id;
		const payments = await Payment.find({ clientId }).sort({ createdAt: -1 });
		res.json(payments);
	} catch (err) {
		console.error("Error fetching payments:", err);
		res.status(500).json({ message: 'Lỗi server' });
	}
});
// ========= POST /cancel =========
router.post('/cancel', async (req, res) => {
	try {
		const { paymentId } = req.body;

		const payment = await Payment.findById(paymentId);
		if (!payment) {
			return res.status(404).json({ success: false, message: 'Không tìm thấy đơn' });
		}

		// Hủy trên PayOS
		const cancelRes = await fetch(
			`https://api-merchant.payos.vn/v2/payment-requests/${payment.orderCode}/cancel`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-client-id': process.env.PAYOS_CLIENT_ID,
					'x-api-key': process.env.PAYOS_API_KEY,
				},
				body: JSON.stringify({ cancellationReason: 'Hết thời gian thanh toán' })
			}
		);
		const cancelData = await cancelRes.json();
		console.log('Cancel response:', JSON.stringify(cancelData));

		// Cập nhật DB
		await Payment.findByIdAndUpdate(paymentId, { status: 'failed' });

		res.json({ success: true });
	} catch (err) {
		console.error('Cancel error:', err.message);
		res.status(500).json({ success: false, message: 'Lỗi hủy đơn' });
	}
});
// ⚠️ module.exports LUÔN ở cuối cùng
module.exports = router;