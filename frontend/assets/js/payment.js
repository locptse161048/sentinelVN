// Payment.js - Handle PayOS payment flow

const API_BASE = 'https://sentinelvn.onrender.com';

// Lấy query params
function getQueryParam(name) {
    const url = new URL(window.location);
    return url.searchParams.get(name);
}

// Setup khi load trang
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Kiểm tra session
        const res = await fetch(`${API_BASE}/api/auth/session`, {
            credentials: 'include'
        });

        if (!res.ok) {
            window.location.href = 'index.html';
            return;
        }

        const user = await res.json();
        
        // Xác định plan từ query param hoặc localStorage
        const plan = getQueryParam('plan') || localStorage.getItem('selectedPlan') || 'PREMIUM';
        const planConfig = {
            'PREMIUM': { name: 'PREMIUM', amount: 75000 },
            'PRO': { name: 'PRO', amount: 500000 }
        };

        const config = planConfig[plan] || planConfig['PREMIUM'];
        
        // Update UI
        document.getElementById('planName').textContent = config.name;
        document.getElementById('amountDisplay').textContent = formatCurrency(config.amount);
        
        // Lưu vào localStorage
        localStorage.setItem('selectedPlan', plan);
        localStorage.setItem('selectedAmount', config.amount);

        // Check status from callback
        const status = getQueryParam('status');
        const paymentId = getQueryParam('id');

        if (status === 'success' && paymentId) {
            await handlePaymentReturn(paymentId);
        } else if (status === 'cancelled') {
            showErrorState('Thanh toán bị hủy bỏ');
        }

    } catch (err) {
        console.error('Setup error:', err);
        window.location.href = 'index.html';
    }
});

// Định dạng tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0
    }).format(amount);
}

// Tạo mã QR
async function handleCreatePayment() {
    try {
        const plan = localStorage.getItem('selectedPlan') || 'PREMIUM';
        
        // Show loading
        document.getElementById('paymentForm').style.display = 'none';
        document.getElementById('loadingState').style.display = 'block';

        const res = await fetch(`${API_BASE}/api/payment/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ plan })
        });

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.message || 'Lỗi tạo thanh toán');
        }

        // Lưu payment ID
        localStorage.setItem('currentPaymentId', data.paymentId);

        // Hiển thị QR code
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('qrState').style.display = 'block';
        document.getElementById('qrCodeImage').src = data.qrCode;
        document.getElementById('qrCodeImage').classList.add('show');

        // Redirect to PayOS checkout
        setTimeout(() => {
            window.open(data.checkoutUrl, '_blank');
        }, 500);

        // Poll for payment confirmation
        pollPaymentStatus(data.paymentId);

    } catch (err) {
        console.error('Create payment error:', err);
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('paymentForm').style.display = 'block';
        showErrorState('Lỗi tạo thanh toán: ' + err.message);
    }
}

// Poll payment status
function pollPaymentStatus(paymentId, maxAttempts = 30) {
    let attempts = 0;
    const interval = setInterval(async () => {
        attempts++;

        try {
            const res = await fetch(`${API_BASE}/api/payment?id=${paymentId}`, {
                credentials: 'include'
            });

            const payments = await res.json();
            const payment = payments.find(p => p._id === paymentId);

            if (payment && payment.status === 'success') {
                clearInterval(interval);
                await handlePaymentReturn(paymentId);
            }

            if (attempts >= maxAttempts) {
                clearInterval(interval);
                // Cho phép user verify manually
                console.log('Polling timeout, payment may still be processing');
            }
        } catch (err) {
            console.error('Poll error:', err);
        }
    }, 2000); // Poll mỗi 2 giây
}

// Xử lý payment return từ PayOS
async function handlePaymentReturn(paymentId) {
    try {
        document.getElementById('qrState').style.display = 'none';
        document.getElementById('loadingState').style.display = 'block';

        const res = await fetch(`${API_BASE}/api/payment/return`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ paymentId })
        });

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        // Show success state
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('successState').style.display = 'block';
        document.getElementById('licenseKeyDisplay').textContent = data.license.key;

        // Save license to localStorage
        localStorage.setItem('licenseKey', data.license.key);
        localStorage.setItem('licensePlan', data.license.plan);
        localStorage.setItem('licenseExpiresAt', data.license.expiresAt);

        // Clear payment data
        localStorage.removeItem('currentPaymentId');
        localStorage.removeItem('selectedPlan');
        localStorage.removeItem('selectedAmount');

    } catch (err) {
        console.error('Payment return error:', err);
        document.getElementById('loadingState').style.display = 'none';
        showErrorState(err.message);
    }
}

// Show error state
function showErrorState(message) {
    document.getElementById('paymentForm').style.display = 'none';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('qrState').style.display = 'none';
    document.getElementById('successState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}

// Copy license key
function copyLicenseKey() {
    const licenseKey = document.getElementById('licenseKeyDisplay').textContent;
    navigator.clipboard.writeText(licenseKey).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅ Đã copy';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}