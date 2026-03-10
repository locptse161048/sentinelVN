const BACKEND_URL = 'https://sentinelvn.onrender.com';

let currentPaymentId = null;
let currentPlan = null;
let pollingInterval = null;
let countdownInterval = null;

// ========= Kiểm tra nếu PayOS redirect về sau thanh toán =========
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  const id = params.get('id');
  if (!status && !id) {
    startPayment('PREMIUM');
    return;
  }

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
// ✅ Sửa thành — kiểm tra null trước
function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
}
function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

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

    hide('loading-section');
    show('qr-section');

    // Render QR
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

    // Bắt đầu polling
    startPolling();

  } catch (err) {
    document.getElementById('loading-section').innerHTML = `
      <p class="error-msg">❌ ${err.message}<br><br>
      <a href="payment.html" class="back-link">Thử lại</a></p>`;
    console.error(err);
  }
}

// ========= Auto Polling =========
function startPolling() {
  stopPolling();
  console.log('🔄 Bắt đầu polling...');

  pollingInterval = setInterval(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/payment/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentId: currentPaymentId }),
      });

      const data = await res.json();

      if (data.success) {
        stopPolling();
        showResult('success', data.license);
      }
    } catch (err) {
      console.warn('Polling error:', err.message);
    }
  }, 3000);

  // Sau 10 phút → hủy đơn và dừng polling
  setTimeout(async () => {
    if (pollingInterval) {
      stopPolling();
      console.log('⏰ Polling dừng sau 10 phút → hủy đơn');
      await cancelPayment();
      showResult('timeout', null);
    }
  }, 10 * 60 * 1000);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// ========= Hủy đơn thanh toán =========
async function cancelPayment() {
  if (!currentPaymentId) return;
  try {
    const res = await fetch(`${BACKEND_URL}/api/payment/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ paymentId: currentPaymentId }),
    });
    const data = await res.json();
    console.log('Đã hủy đơn:', data);
  } catch (err) {
    console.error('Lỗi hủy đơn:', err.message);
  }
}

// ========= Gọi backend xác nhận (dùng khi PayOS redirect) =========
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

// ========= Countdown 30s rồi redirect =========
function startCountdown(seconds, onComplete) {
  // Dừng countdown cũ nếu có
  if (countdownInterval) clearInterval(countdownInterval);

  let remaining = seconds;
  const el = document.getElementById('countdown-text');
  if (el) el.textContent = remaining;

  countdownInterval = setInterval(() => {
    remaining--;
    if (el) el.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      onComplete();
    }
  }, 1000);
}

// ========= Hiển thị kết quả =========
function showResult(type, license, message) {
  stopPolling();
  show('result-section');
  hide('loading-section');
  hide('qr-section');
  hide('plan-section');

  const el = document.getElementById('result-content');

  if (type === 'success') {
    el.innerHTML = `
      <div class="success-box">
        <p style="font-size:1.3rem;margin-bottom:0.5rem">✅ Thanh toán thành công!</p>
        <p style="margin-bottom:1.2rem;color:#86efac;font-size:0.95rem;">
          License của bạn đã được tạo. Bạn có thể xem chi tiết ở tab "Gói đã đăng ký".
        </p>
        <p style="color:#86efac;font-size:0.85rem;margin-bottom:0.8rem">
          Tự động quay về trang chủ sau <span id="countdown-text">30</span> giây...
        </p>
        <a href="index.html"
           style="display:inline-block;background:#22c55e;color:white;padding:0.6rem 1.5rem;
                  border-radius:8px;text-decoration:none;font-size:0.95rem;">
          🏠 Quay về trang chủ ngay
        </a>
      </div>`;

    // Bắt đầu đếm ngược 30 giây
    startCountdown(30, () => {
      window.location.href = 'index.html';
    });

  } else if (type === 'cancel') {
    el.innerHTML = `
      <div class="cancel-box">
        <p style="font-size:1.2rem">❌ Bạn đã hủy thanh toán.</p>
        <br>
        <a href="index.html" class="back-link">← Quay về trang chủ</a>
      </div>`;

  } else if (type === 'timeout') {
    el.innerHTML = `
      <div class="cancel-box">
        <p style="font-size:1.1rem">⏰ Đơn thanh toán đã hết hạn.</p>
        <p style="font-size:0.85rem;margin-top:0.5rem">
          Đơn hàng đã bị hủy do quá 10 phút không thanh toán.
        </p>
        <br>
        <a href="payment.html" class="back-link" style="color:#fca5a5">← Tạo đơn mới</a>
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
// ========= Idle Timeout 15 phút =========
let idleTimer = null;
const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 phút

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    // Tự động logout khi idle 15 phút
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    window.location.reload();
  }, IDLE_TIMEOUT);
}

// Các sự kiện được coi là "có hoạt động"
['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(event => {
  document.addEventListener(event, resetIdleTimer, { passive: true });
});

// Bắt đầu đếm ngay khi load trang
resetIdleTimer();