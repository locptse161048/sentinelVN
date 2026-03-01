const BACKEND_URL = 'https://sentinelvn.onrender.com';

let currentPaymentId = null;
let currentPlan = null;

// ========= Kiểm tra nếu PayOS redirect về sau thanh toán =========
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  const id = params.get('id');

  // Tự động chọn plan nếu có query ?plan=PREMIUM
  const planFromQuery = params.get('plan');
  if (planFromQuery === 'PREMIUM' || planFromQuery === 'PRO') {
    startPayment(planFromQuery);
    return;
  }

  if (status === 'success' && id) {
    currentPaymentId = id;
    show('loading-section');
    document.getElementById('loading-section').innerHTML =
      '<p class="loading">⏳ Đang xác nhận thanh toán...</p>';
    verifyPayment(id);
  } else if (status === 'cancelled') {
    show('result-section');
    hide('plan-section');
    showResult('cancel', null);
  }
});

// ========= Helper show/hide =========
function show(id) { document.getElementById(id).style.display = 'block'; }
function hide(id) { document.getElementById(id).style.display = 'none'; }

// ========= Tạo thanh toán =========
async function startPayment(plan) {
  currentPlan = plan;
  hide('plan-section');
  show('loading-section');

  try {
    const res = await fetch(`${BACKEND_URL}/api/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ plan }),
    });

    const data = await res.json();

    if (!data.success) throw new Error(data.message || 'Lỗi tạo đơn hàng');

    currentPaymentId = data.paymentId;

    // Hiển thị QR section
    hide('loading-section');
    show('qr-section');

    // ✅ FIX: Render QR từ chuỗi EMVCo bằng QRCode.js (không dùng src=)
    document.getElementById('qr-canvas').innerHTML = '';
    new QRCode(document.getElementById('qr-canvas'), {
      text: data.qrCode,
      width: 220,
      height: 220,
      colorDark: '#000000',
      colorLight: '#ffffff',
    });

    document.getElementById('checkout-link').href = data.checkoutUrl;
    document.getElementById('order-code').textContent = data.paymentId;

    const amounts = { PREMIUM: '75.000 ₫', PRO: '500.000 ₫' };
    document.getElementById('amount-text').textContent = amounts[plan] || '';

  } catch (err) {
    document.getElementById('loading-section').innerHTML = `
      <p class="error-msg">❌ ${err.message}<br><br>
      <a href="payment.html" class="back-link">Thử lại</a></p>`;
    console.error(err);
  }
}

// ========= Khi user bấm "Tôi đã thanh toán xong" =========
async function checkPayment() {
  if (!currentPaymentId) return;
  hide('qr-section');
  show('loading-section');
  document.getElementById('loading-section').innerHTML =
    '<p class="loading">⏳ Đang xác nhận...</p>';
  verifyPayment(currentPaymentId);
}

// ========= Gọi backend xác nhận =========
async function verifyPayment(paymentId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/payment/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ paymentId }),
    });

    const data = await res.json();
    hide('loading-section');

    if (data.success) {
      showResult('success', data.license);
    } else {
      showResult('pending', null, data.message);
    }

  } catch (err) {
    document.getElementById('loading-section').innerHTML =
      '<p class="error-msg">❌ Lỗi xác nhận. Vui lòng thử lại.<br><br>' +
      '<a href="payment.html" class="back-link">Thử lại</a></p>';
  }
}

// ========= Hiển thị kết quả =========
function showResult(type, license, message) {
  show('result-section');
  hide('loading-section');
  hide('qr-section');
  hide('plan-section');

  const el = document.getElementById('result-content');

  if (type === 'success') {
    el.innerHTML = `
      <div class="success-box">
        <p style="font-size:1.3rem;margin-bottom:0.5rem">✅ Thanh toán thành công!</p>
        <p style="margin-bottom:1rem">License key của bạn:</p>
        <div class="license-key">${license?.key || 'N/A'}</div>
        <p style="font-size:0.8rem;color:#86efac;margin-top:0.5rem">
          Hạn sử dụng: ${license?.expiresAt
            ? new Date(license.expiresAt).toLocaleDateString('vi-VN')
            : 'N/A'}
        </p>
      </div>`;
  } else if (type === 'cancel') {
    el.innerHTML = `
      <div class="cancel-box">
        <p style="font-size:1.2rem">❌ Bạn đã hủy thanh toán.</p>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="cancel-box">
        <p>⚠️ ${message || 'Chưa xác nhận được thanh toán.'}</p>
        <p style="font-size:0.85rem;margin-top:0.5rem">
          Nếu bạn đã chuyển tiền, vui lòng đợi vài phút rồi thử lại.
        </p>
        <br>
        <a href="payment.html" class="back-link" style="color:#fca5a5">← Thử lại</a>
      </div>`;
  }
}