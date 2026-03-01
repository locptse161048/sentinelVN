const express = require('express');
const router = express.Router();
const Payment = require('../models/payment');
const License = require('../models/license');
const crypto = require('crypto');

const { PayOS } = require('@payos/node');
const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID,
    process.env.PAYOS_API_KEY,
    process.env.PAYOS_CHECKSUM_KEY
);

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

function getExpiresDate(days = 30) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// POST /api/webhook/payos
router.post('/payos', async (req, res) => {
    try {
        const webhookData = req.body;

        // Bỏ qua data test từ PayOS dashboard
        if (webhookData.data?.orderCode === 123) {
            console.log('Bỏ qua webhook test từ PayOS dashboard');
            return res.status(200).json({ success: true });
        }

        console.log('Webhook received:', JSON.stringify(webhookData));

        // 1. Tính signature — khai báo TRƯỚC khi dùng
        // ✅ Thứ tự alphabet — đúng
        const signatureString = Object.keys(webhookData.data)
            .filter(key => webhookData.data[key] !== '' &&
                webhookData.data[key] !== null &&
                webhookData.data[key] !== undefined)
            .sort()
            .map(key => `${key}=${webhookData.data[key]}`)
            .join('&');

        // ✅ Khai báo expectedSignature TRƯỚC khi log
        const expectedSignature = crypto
            .createHmac('sha256', process.env.PAYOS_CHECKSUM_KEY)
            .update(signatureString)
            .digest('hex');

        // Log để debug — xóa sau khi xác nhận chạy đúng
        console.log('signatureString:', signatureString);
        console.log('expectedSignature:', expectedSignature);
        console.log('receivedSignature:', webhookData.signature);

        // 2. Xác thực chữ ký
        if (webhookData.signature !== expectedSignature) {
            console.warn('Invalid webhook signature');
            return res.status(200).json({ success: true });
        }

        // 3. Chỉ xử lý khi thanh toán thành công
        if (webhookData.code !== '00') {
            return res.json({ received: true });
        }

        const orderCode = webhookData.data.orderCode;

        // 4. Tìm Payment theo orderCode
        const payment = await Payment.findOne({ orderCode });
        if (!payment) {
            console.error('Payment not found for orderCode:', orderCode);
            return res.status(404).json({ error: 'Payment not found' });
        }

        // 5. Tránh xử lý trùng
        if (payment.status === 'success') {
            return res.json({ received: true, message: 'Already processed' });
        }

        // 6. Cập nhật Payment → success
        await Payment.findByIdAndUpdate(payment._id, {
            status: 'success',
            transactionId: webhookData.data.reference || String(orderCode)
        });

        // 7. Tạo License
        const licenseKey = genKey(payment.plan);
        const expiresAt = getExpiresDate(30);

        await License.create({
            id: webhookData.data.reference || String(orderCode),
            clientId: payment.clientId,
            key: licenseKey,
            plan: payment.plan,
            amount: payment.amount,
            expiresAt,
        });

        console.log('✅ License created via webhook:', licenseKey);

        return res.json({ received: true });

    } catch (err) {
        console.error('Webhook error:', err);
        return res.status(200).json({ received: true });
    }
});

module.exports = router;