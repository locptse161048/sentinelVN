const API_BASE = 'https://sentinelvn.onrender.com';

document.getElementById('year').textContent = new Date().getFullYear();

// ========= Firebase Configuration =========
import { initializeApp } from "https://www.gstatic.com/firebaseapp/9.23.0/firebase-app.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, PhoneMultiFactorGenerator } from "https://www.gstatic.com/firebaseapp/9.23.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCOcvfL4IVHpuEXMkQWNdnPBN5LH35SYSU",
  authDomain: "sentinel-vn.firebaseapp.com",
  projectId: "sentinel-vn",
  storageBucket: "sentinel-vn.firebasestorage.app",
  messagingSenderId: "426009488004",
  appId: "1:426009488004:web:635069767c20ec76f430d1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ========= STATE =========
let registrationData = {};
let confirmationResult = null;

// ========= STEP 1: Validate personal info =========
const step1Form = document.getElementById('step1Form');
step1Form.addEventListener('submit', (e) => {
  e.preventDefault();

  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const gender = document.getElementById('gender').value;
  const city = document.getElementById('city').value.trim();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('passwordConfirm').value;
  const step1Msg = document.getElementById('step1Msg');

  step1Msg.textContent = '';

  // ⚠️ Validate
  if (!firstName || !lastName || !gender || !city || !email || !password) {
    step1Msg.textContent = '⚠️ Vui lòng điền đầy đủ thông tin.';
    step1Msg.style.color = '#f87171';
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    step1Msg.textContent = '⚠️ Email không hợp lệ.';
    step1Msg.style.color = '#f87171';
    return;
  }

  if (password.length < 8) {
    step1Msg.textContent = '⚠️ Mật khẩu phải tối thiểu 8 ký tự.';
    step1Msg.style.color = '#f87171';
    return;
  }

  if (!/[A-Z]/.test(password)) {
    step1Msg.textContent = '⚠️ Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa.';
    step1Msg.style.color = '#f87171';
    return;
  }

  if (!/[a-z]/.test(password)) {
    step1Msg.textContent = '⚠️ Mật khẩu phải chứa ít nhất 1 chữ cái viết thường.';
    step1Msg.style.color = '#f87171';
    return;
  }

  if (!/[0-9]/.test(password)) {
    step1Msg.textContent = '⚠️ Mật khẩu phải chứa ít nhất 1 chữ số.';
    step1Msg.style.color = '#f87171';
    return;
  }

  if (password !== passwordConfirm) {
    document.getElementById('passwordMismatch').classList.remove('hidden');
    const passwordConfirmInput = document.getElementById('passwordConfirm');
    passwordConfirmInput.style.borderColor = '#f87171';
    return;
  }

  // ✅ All validations passed - Move to step 2
  registrationData = {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    gender,
    city,
    email,
    password
  };

  // Toggle display
  document.getElementById('step1Form').style.display = 'none';
  document.getElementById('step2Container').style.display = 'block';
  
  // Update step indicator
  document.querySelectorAll('.flex-1').forEach((el, i) => {
    if (i === 1) el.classList.remove('bg-white/20');
    if (i === 1) el.classList.add('bg-brand-400');
  });

  initRecaptcha();
});

// ========= PASSWORD CONFIRM VALIDATION =========
const passwordConfirmInput = document.getElementById('passwordConfirm');
passwordConfirmInput?.addEventListener('change', () => {
  const password = document.getElementById('password').value;
  const passwordConfirm = passwordConfirmInput.value;
  const mismatchEl = document.getElementById('passwordMismatch');

  if (password !== passwordConfirm) {
    mismatchEl.classList.remove('hidden');
    passwordConfirmInput.style.borderColor = '#f87171';
  } else {
    mismatchEl.classList.add('hidden');
    passwordConfirmInput.style.borderColor = '';
  }
});

// ========= RECAPTCHA INITIALIZATION =========
function initRecaptcha() {
  try {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'normal',
      'callback': (token) => {
        console.log('[RECAPTCHA] Token received');
      },
      'expired-callback': () => {
        console.log('[RECAPTCHA] Expired');
      }
    });
  } catch (err) {
    console.error('[RECAPTCHA] Error:', err.message);
  }
}

// ========= SEND OTP =========
const sendOtpBtn = document.getElementById('sendOtpBtn');
sendOtpBtn?.addEventListener('click', async (e) => {
  e.preventDefault();

  const phone = document.getElementById('phone').value.trim().replace(/\D/g, '');
  const phoneError = document.getElementById('phoneError');
  const step2Msg = document.getElementById('step2Msg');

  step2Msg.textContent = '';
  phoneError.classList.add('hidden');

  // ⚠️ Validate phone
  if (!/^\d{10}$/.test(phone)) {
    phoneError.classList.remove('hidden');
    return;
  }

  try {
    step2Msg.textContent = '⏳ Đang gửi mã OTP...';
    step2Msg.style.color = '#fff';

    const phoneNumber = '+84' + phone.substring(1); // Vietnam country code
    console.log('[OTP] Sending OTP to:', phoneNumber);

    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);

    step2Msg.textContent = '✅ Mã OTP đã được gửi!';
    step2Msg.style.color = '#4ade80';

    // Show OTP input
    document.getElementById('otpSection').classList.remove('hidden');
    sendOtpBtn.disabled = true;
    sendOtpBtn.style.opacity = '0.5';

  } catch (err) {
    console.error('[OTP] Error:', err.message);
    step2Msg.textContent = '❌ ' + (err.message || 'Không thể gửi OTP. Vui lòng thử lại.');
    step2Msg.style.color = '#f87171';

    // Reinitialize recaptcha on error
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }
    initRecaptcha();
  }
});

// ========= VERIFY OTP =========
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
verifyOtpBtn?.addEventListener('click', async (e) => {
  e.preventDefault();

  const otpCode = document.getElementById('otpCode').value.trim();
  const otpError = document.getElementById('otpError');
  const step2Msg = document.getElementById('step2Msg');

  otpError.textContent = '';
  step2Msg.textContent = '';

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

    const result = await confirmationResult.confirm(otpCode);
    console.log('[OTP] Verified successfully for phone:', result.user.phoneNumber);

    // ✅ Phone verified - Save and register
    registrationData.phone = result.user.phoneNumber.substring(3); // Remove +84
    registrationData.phoneVerified = true;

    step2Msg.textContent = '⏳ Đang lưu thông tin...';
    step2Msg.style.color = '#fff';

    const registerRes = await fetch(`${API_BASE}/api/auth/register/verify-phone`, {
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
        phone: registrationData.phone
      })
    });

    const registerData = await registerRes.json();

    if (!registerRes.ok) {
      step2Msg.textContent = '❌ ' + (registerData.message || 'Đăng ký thất bại');
      step2Msg.style.color = '#f87171';
      return;
    }

    step2Msg.textContent = '✅ Đăng ký thành công! Đang chuyển hướng...';
    step2Msg.style.color = '#4ade80';

    // Redirect to index.html after 2 seconds
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);

  } catch (err) {
    console.error('[OTP VERIFY] Error:', err.message);
    otpError.textContent = '❌ ' + (err.message || 'Mã OTP không hợp lệ');
  }
});

// ========= BACK BUTTON =========
const backBtn = document.getElementById('backBtn');
backBtn?.addEventListener('click', (e) => {
  e.preventDefault();

  // Clear confirmation result
  confirmationResult = null;

  // Toggle display
  document.getElementById('step1Form').style.display = 'block';
  document.getElementById('step2Container').style.display = 'none';

  // Reset step 2
  document.getElementById('otpSection').classList.add('hidden');
  document.getElementById('phone').value = '';
  document.getElementById('otpCode').value = '';
  document.getElementById('sendOtpBtn').disabled = false;
  document.getElementById('sendOtpBtn').style.opacity = '1';

  // Update step indicator
  document.querySelectorAll('.flex-1').forEach((el, i) => {
    if (i === 0) el.classList.add('bg-brand-400');
    if (i === 1) el.classList.remove('bg-brand-400');
    if (i === 1) el.classList.add('bg-white/20');
  });

  // Clear recaptcha
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
  }
});

// ========= PHONE VALIDATION =========
function validatePhone(input) {
  input.value = input.value.replace(/\D/g, '').slice(0, 10);
  const err = document.getElementById('phoneError');
  if (input.value.length > 0 && input.value.length < 10) {
    err.classList.remove('hidden');
  } else {
    err.classList.add('hidden');
  }
}
