const API_BASE = 'https://sentinelvn.onrender.com';

document.getElementById('year').textContent = new Date().getFullYear();

// ========= Firebase Configuration =========
import { initializeApp } from "https://www.gstatic.com/firebaseapp/9.23.0/firebase-app.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebaseapp/9.23.0/firebase-auth.js";

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
  } else if (step === 3) {
    document.getElementById('step3Container').style.display = 'block';
  } else if (step === 4) {
    document.getElementById('step4Container').style.display = 'block';
  }

  currentStep = step;
  updateStepIndicator(step);

  // Initialize recaptcha for step 2
  if (step === 2) {
    initRecaptcha();
  }
}


// ========= STEP 1: Validate personal info =========
const step1Form = document.getElementById('step1Form');
step1Form.addEventListener('submit', (e) => {
  e.preventDefault();

  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const gender = document.getElementById('gender').value;
  const city = document.getElementById('city').value.trim();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const step1Msg = document.getElementById('step1Msg');

  step1Msg.textContent = '';

  // ⚠️ Validate
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

  // ✅ All validations passed - Move to step 2
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

// ========= STEP 2: PHONE VERIFICATION =========
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

    // ✅ Phone verified - Save to registration data
    registrationData.phone = result.user.phoneNumber.replace(/\D/g, '').slice(-10);
    registrationData.phoneVerified = true;

    step2Msg.textContent = '✅ Xác thực thành công! Tiếp tục...';
    step2Msg.style.color = '#4ade80';

    // Move to step 3
    setTimeout(() => {
      showStep(3);
    }, 1000);

  } catch (err) {
    console.error('[OTP VERIFY] Error:', err.message);
    otpError.textContent = '❌ ' + (err.message || 'Mã OTP không hợp lệ');
  }
});

// ========= BACK BUTTON FROM STEP 2 =========
const backBtn2 = document.getElementById('backBtn2');
backBtn2?.addEventListener('click', (e) => {
  e.preventDefault();

  // Clear confirmation result
  confirmationResult = null;

  // Reset step 2
  document.getElementById('otpSection').classList.add('hidden');
  document.getElementById('phone').value = '';
  document.getElementById('otpCode').value = '';
  document.getElementById('sendOtpBtn').disabled = false;
  document.getElementById('sendOtpBtn').style.opacity = '1';
  document.getElementById('step2Msg').textContent = '';

  // Clear recaptcha
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
  }

  showStep(1);
});

// ========= STEP 3: PASSWORD =========
const step3Form = document.getElementById('step3Form');
step3Form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('passwordConfirm').value;
  const step3Msg = document.getElementById('step3Msg');
  const passwordError = document.getElementById('passwordError');

  step3Msg.textContent = '';
  passwordError.textContent = '';

  // ⚠️ Validate password
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

  // ✅ Password valid - Move to step 4 (Submit)
  registrationData.password = password;

  // Show step 4
  showStep(4);

  // Register account
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
        phone: registrationData.phone,
        phoneVerified: true
      })
    });

    const registerData = await registerRes.json();

    if (!registerRes.ok) {
      const step4Msg = document.getElementById('step4Msg');
      step4Msg.textContent = '❌ ' + (registerData.message || 'Đăng ký thất bại');
      step4Msg.style.color = '#f87171';
      console.error('[REGISTER] Error:', registerData.message);
      return;
    }

    const step4Msg = document.getElementById('step4Msg');
    step4Msg.textContent = '✅ Đăng ký thành công! Đang chuyển hướng...';
    step4Msg.style.color = '#4ade80';

    // Redirect to index.html after 2 seconds
    setTimeout(() => {
      window.location.href = 'client.html';
    }, 2000);

  } catch (err) {
    console.error('[REGISTER] Error:', err.message);
    const step4Msg = document.getElementById('step4Msg');
    step4Msg.textContent = '❌ Lỗi server: ' + err.message;
    step4Msg.style.color = '#f87171';
  }
});

// ========= BACK BUTTON FROM STEP 3 =========
const backBtn3 = document.getElementById('backBtn3');
backBtn3?.addEventListener('click', (e) => {
  e.preventDefault();

  // Reset step 3
  document.getElementById('password').value = '';
  document.getElementById('passwordConfirm').value = '';
  document.getElementById('passwordError').textContent = '';
  document.getElementById('passwordMismatch').classList.add('hidden');
  document.getElementById('step3Msg').textContent = '';

  showStep(2);
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
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }
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

// Add event listener for real-time phone validation
const phoneInput = document.getElementById('phone');
phoneInput?.addEventListener('input', function() {
  validatePhone(this);
});
