const API_BASE = 'https://sentinelvn.onrender.com';

console.log('[INIT] Register.js loaded. Checking Firebase...');
document.getElementById('year').textContent = new Date().getFullYear();

// ========= Firebase Configuration (Compat API) =========
const firebaseConfig = {
  apiKey: "AIzaSyCOcvfL4IVHpuEXMkQWNdnPBN5LH35SYSU",
  authDomain: "sentinel-vn.firebaseapp.com",
  projectId: "sentinel-vn",
  storageBucket: "sentinel-vn.firebasestorage.app",
  messagingSenderId: "426009488004",
  appId: "1:426009488004:web:635069767c20ec76f430d1"
};

// ========= Initialize Firebase (Compat API) =========
let auth = null;
let firebaseReady = false;

(function initializeFirebase() {
  console.log('[FIREBASE] Initializing Firebase...');
  try {
    // ✅ Firebase SDK đã có sẵn vì không dùng "defer" và URL CDN đúng
    if (typeof firebase === 'undefined') {
      console.error('[FIREBASE] ❌ Firebase SDK not found. Kiểm tra lại URL CDN trong register.html');
      return;
    }

    if (firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
      console.log('[FIREBASE] App initialized.');
    } else {
      console.log('[FIREBASE] App already initialized.');
    }

    auth = firebase.auth();
    firebaseReady = true;
    console.log('[FIREBASE] ✅ Firebase ready. Auth:', auth !== null);
  } catch (err) {
    console.error('[FIREBASE] ❌ Init error:', err.message);
    firebaseReady = false;
    auth = null;
  }
})();

// ========= STATE =========
let registrationData = {};
let confirmationResult = null;
let currentStep = 1;

// ========= UTILITY FUNCTIONS =========
function updateStepIndicator(step) {
  document.querySelectorAll('.step-indicator').forEach((el) => {
    const stepNum = parseInt(el.getAttribute('data-step'));
    if (stepNum <= step) {
      el.classList.remove('bg-white/20');
      el.classList.add('bg-brand-400');
    } else {
      el.classList.add('bg-white/20');
      el.classList.remove('bg-brand-400');
    }
  });
}

function showStep(step) {
  // Hide all steps
  document.getElementById('step1Form').style.display = 'none';
  document.getElementById('step2Container').style.display = 'none';
  document.getElementById('step3Container').style.display = 'none';
  document.getElementById('step4Container').style.display = 'none';

  // Show the target step
  if (step === 1) {
    document.getElementById('step1Form').style.display = 'block';
  } else if (step === 2) {
    document.getElementById('step2Container').style.display = 'block';
    // Initialize reCAPTCHA after container is visible
    setTimeout(() => initRecaptcha(), 100);
  } else if (step === 3) {
    document.getElementById('step3Container').style.display = 'block';
  } else if (step === 4) {
    document.getElementById('step4Container').style.display = 'block';
  }

  currentStep = step;
  updateStepIndicator(step);
}

// ========= STEP 1: Validate personal info =========
const step1Form = document.getElementById('step1Form');
if (step1Form) {
  step1Form.addEventListener('submit', (e) => {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const gender = document.getElementById('gender').value;
    const city = document.getElementById('city').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const step1Msg = document.getElementById('step1Msg');

    step1Msg.textContent = '';

    if (!firstName || !lastName || !gender || !city || !email) {
      step1Msg.textContent = '⚠️ Vui lòng điền đầy đủ thông tin.';
      step1Msg.style.color = '#f87171';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      step1Msg.textContent = '⚠️ Email không hợp lệ.';
      step1Msg.style.color = '#f87171';
      return;
    }

    registrationData = {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      gender,
      city,
      email
    };

    showStep(2);
  });
}

// ========= STEP 2: PHONE VERIFICATION =========
const sendOtpBtn = document.getElementById('sendOtpBtn');
if (sendOtpBtn) {
  sendOtpBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const phone = document.getElementById('phone').value.trim().replace(/\D/g, '');
    const phoneError = document.getElementById('phoneError');
    const step2Msg = document.getElementById('step2Msg');

    step2Msg.textContent = '';
    phoneError.classList.add('hidden');

    if (!/^\d{10}$/.test(phone)) {
      phoneError.classList.remove('hidden');
      return;
    }

    if (!auth) {
      console.error('[OTP] Auth not initialized. firebaseReady:', firebaseReady);
      step2Msg.textContent = '❌ Firebase chưa khởi tạo. Vui lòng tải lại trang.';
      step2Msg.style.color = '#f87171';
      return;
    }

    if (!window.recaptchaVerifier) {
      step2Msg.textContent = '❌ reCAPTCHA chưa sẵn sàng. Vui lòng chờ...';
      step2Msg.style.color = '#f87171';
      initRecaptcha();
      return;
    }

    try {
      step2Msg.textContent = '⏳ Đang gửi mã OTP...';
      step2Msg.style.color = '#fff';
      sendOtpBtn.disabled = true;

      // ✅ Chuyển số 0xxxxxxxxx → +84xxxxxxxxx
      const phoneNumber = '+84' + phone.substring(1);
      console.log('[OTP] Sending OTP to:', phoneNumber);

      confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier);

      step2Msg.textContent = '✅ Mã OTP đã được gửi!';
      step2Msg.style.color = '#4ade80';

      document.getElementById('otpSection').classList.remove('hidden');
      sendOtpBtn.style.opacity = '0.5';

    } catch (err) {
      console.error('[OTP] Error:', err.code, err.message);
      step2Msg.textContent = '❌ ' + (err.message || 'Không thể gửi OTP. Vui lòng thử lại.');
      step2Msg.style.color = '#f87171';
      sendOtpBtn.disabled = false;

      // ✅ Reset reCAPTCHA khi gặp lỗi
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      initRecaptcha();
    }
  });
}

// ========= VERIFY OTP =========
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
if (verifyOtpBtn) {
  verifyOtpBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const otpCode = document.getElementById('otpCode').value.trim();
    const otpError = document.getElementById('otpError');
    const step2Msg = document.getElementById('step2Msg');

    otpError.textContent = '';

    if (!/^\d{6}$/.test(otpCode)) {
      otpError.textContent = 'Mã OTP phải là 6 chữ số';
      return;
    }

    if (!confirmationResult) {
      otpError.textContent = 'Vui lòng gửi OTP trước';
      return;
    }

    try {
      step2Msg.textContent = '⏳ Đang xác thực...';
      step2Msg.style.color = '#fff';
      verifyOtpBtn.disabled = true;

      const result = await confirmationResult.confirm(otpCode);
      console.log('[OTP] Verified successfully for phone:', result.user.phoneNumber);

      // ✅ Lưu số điện thoại đã xác thực vào registrationData (convert +84... to 0...)
      const originalPhone = result.user.phoneNumber.replace(/\D/g, '');
      registrationData.phone = '0' + originalPhone.substring(2);
      registrationData.phoneVerified = true;

      step2Msg.textContent = '✅ Xác thực thành công! Đang chuyển bước...';
      step2Msg.style.color = '#4ade80';

      setTimeout(() => showStep(3), 1000);

    } catch (err) {
      console.error('[OTP VERIFY] Error:', err.code, err.message);
      otpError.textContent = '❌ ' + (err.message || 'Mã OTP không hợp lệ');
      verifyOtpBtn.disabled = false;
    }
  });
}

// ========= BACK BUTTON FROM STEP 2 =========
const backBtn2 = document.getElementById('backBtn2');
if (backBtn2) {
  backBtn2.addEventListener('click', (e) => {
    e.preventDefault();

    confirmationResult = null;

    // Reset step 2 UI
    document.getElementById('otpSection').classList.add('hidden');
    document.getElementById('phone').value = '';
    document.getElementById('otpCode').value = '';
    document.getElementById('step2Msg').textContent = '';

    const btn = document.getElementById('sendOtpBtn');
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
    }

    // ✅ Clear reCAPTCHA khi quay lại
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }

    showStep(1);
  });
}

// ========= STEP 3: PASSWORD =========
const step3Form = document.getElementById('step3Form');
if (step3Form) {
  step3Form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    const step3Msg = document.getElementById('step3Msg');
    const passwordError = document.getElementById('passwordError');

    step3Msg.textContent = '';
    passwordError.textContent = '';

    if (!password || password.length < 8) {
      passwordError.textContent = '⚠️ Mật khẩu phải tối thiểu 8 ký tự.';
      return;
    }

    if (!/[A-Z]/.test(password)) {
      passwordError.textContent = '⚠️ Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa.';
      return;
    }

    if (!/[a-z]/.test(password)) {
      passwordError.textContent = '⚠️ Mật khẩu phải chứa ít nhất 1 chữ cái viết thường.';
      return;
    }

    if (!/[0-9]/.test(password)) {
      passwordError.textContent = '⚠️ Mật khẩu phải chứa ít nhất 1 chữ số.';
      return;
    }

    if (password !== passwordConfirm) {
      document.getElementById('passwordMismatch').classList.remove('hidden');
      document.getElementById('passwordConfirm').style.borderColor = '#f87171';
      return;
    }

    registrationData.password = password;
    showStep(4);

    try {
      const registerRes = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registrationData.email,
          password: registrationData.password,
          fullName: registrationData.fullName,
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          gender: registrationData.gender,
          city: registrationData.city,
          phone: registrationData.phone || null,
          phoneVerified: registrationData.phoneVerified === true
        })
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        const step4Msg = document.getElementById('step4Msg');
        step4Msg.textContent = '❌ ' + (registerData.message || 'Đăng ký thất bại');
        step4Msg.style.color = '#f87171';
        document.getElementById('loadingSpinner').style.display = 'none';
        console.error('[REGISTER] Error:', registerData.message);
        return;
      }

      const step4Msg = document.getElementById('step4Msg');
      step4Msg.textContent = '✅ Đăng ký thành công! Đang chuyển hướng...';
      step4Msg.style.color = '#4ade80';
      document.getElementById('loadingSpinner').textContent = '✅';
      document.getElementById('loadingSpinner').style.animation = 'none';

      setTimeout(() => {
        window.location.href = 'client.html';
      }, 2000);

    } catch (err) {
      console.error('[REGISTER] Error:', err.message);
      const step4Msg = document.getElementById('step4Msg');
      step4Msg.textContent = '❌ Lỗi server: ' + err.message;
      step4Msg.style.color = '#f87171';
      document.getElementById('loadingSpinner').style.display = 'none';
    }
  });
}

// ========= BACK BUTTON FROM STEP 3 =========
const backBtn3 = document.getElementById('backBtn3');
if (backBtn3) {
  backBtn3.addEventListener('click', (e) => {
    e.preventDefault();

    document.getElementById('password').value = '';
    document.getElementById('passwordConfirm').value = '';
    document.getElementById('passwordError').textContent = '';
    document.getElementById('passwordMismatch').classList.add('hidden');
    document.getElementById('step3Msg').textContent = '';

    showStep(2);
  });
}

// ========= PASSWORD CONFIRM VALIDATION =========
const passwordConfirmInput = document.getElementById('passwordConfirm');
if (passwordConfirmInput) {
  passwordConfirmInput.addEventListener('input', () => {
    const password = document.getElementById('password').value;
    const mismatchEl = document.getElementById('passwordMismatch');

    if (password !== passwordConfirmInput.value) {
      mismatchEl.classList.remove('hidden');
      passwordConfirmInput.style.borderColor = '#f87171';
    } else {
      mismatchEl.classList.add('hidden');
      passwordConfirmInput.style.borderColor = '';
    }
  });
}

// ========= RECAPTCHA INITIALIZATION =========
function initRecaptcha() {
  try {
    if (!auth) {
      console.error('[RECAPTCHA] Auth not initialized.');
      return;
    }

    // ✅ Clear verifier cũ nếu tồn tại
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }

    console.log('[RECAPTCHA] Creating RecaptchaVerifier...');
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
      size: 'normal',
      callback: (token) => {
        console.log('[RECAPTCHA] ✅ Token received');
      },
      'expired-callback': () => {
        console.warn('[RECAPTCHA] Expired. Re-initializing...');
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
        initRecaptcha();
      }
    });

    // ✅ Render reCAPTCHA widget vào container
    window.recaptchaVerifier.render().then((widgetId) => {
      window.recaptchaWidgetId = widgetId;
      console.log('[RECAPTCHA] ✅ Rendered successfully. widgetId:', widgetId);
    }).catch((err) => {
      console.error('[RECAPTCHA] Render error:', err.message);
    });

  } catch (err) {
    console.error('[RECAPTCHA] Init error:', err.message);
  }
}

// ========= PHONE VALIDATION =========
const phoneInput = document.getElementById('phone');
if (phoneInput) {
  phoneInput.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 10);
    const err = document.getElementById('phoneError');
    if (this.value.length > 0 && this.value.length < 10) {
      err.classList.remove('hidden');
    } else {
      err.classList.add('hidden');
    }
  });
}