const API_BASE = 'https://sentinelvn.onrender.com';

console.log('[INIT] Register.js loaded - Email OTP Version');
document.getElementById('year').textContent = new Date().getFullYear();

// ========= STATE =========
let registrationData = {};
let currentStep = 1;
let countdownInterval = null;
let resendCountdownInterval = null;
let otpExpireAt = null;
let otpAttemptsLeft = 3;

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
    startCountdown(); // Start OTP countdown when showing step 2
  } else if (step === 3) {
    document.getElementById('step3Container').style.display = 'block';
  } else if (step === 4) {
    document.getElementById('step4Container').style.display = 'block';
  }

  currentStep = step;
  updateStepIndicator(step);
}

// ========= UTILITY FUNCTIONS FOR OTP =========

/**
 * Format time remaining in MM:SS format
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Start countdown timer synchronized with server expiration time
 */
function startCountdown() {
  if (!otpExpireAt) return;

  // Clear any existing interval
  if (countdownInterval) clearInterval(countdownInterval);

  const updateCountdown = () => {
    const now = new Date();
    const expireTime = new Date(otpExpireAt);
    const secondsLeft = Math.max(0, Math.floor((expireTime - now) / 1000));

    const countdownEl = document.getElementById('countdown');
    if (countdownEl) {
      countdownEl.textContent = formatTime(secondsLeft);
    }

    // If time is up
    if (secondsLeft === 0) {
      clearInterval(countdownInterval);
      const countdownSection = document.getElementById('countdownSection');
      if (countdownSection) {
        countdownSection.innerHTML = '<span style="color: #f87171;">⚠️ Mã OTP đã hết hạn</span>';
      }
    }
  };

  updateCountdown(); // Update immediately
  countdownInterval = setInterval(updateCountdown, 1000);
}

/**
 * Start resend countdown timer (2 minutes)
 */
function startResendCountdown() {
  if (resendCountdownInterval) clearInterval(resendCountdownInterval);

  const resendBtn = document.getElementById('resendOtpBtn');
  const resendCountdownEl = document.getElementById('resendCountdown');

  let secondsLeft = 120; // 2 minutes

  const updateResendCountdown = () => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    if (resendCountdownEl) {
      resendCountdownEl.textContent = timeStr;
    }

    if (secondsLeft === 0) {
      clearInterval(resendCountdownInterval);
      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.style.opacity = '1';
      }
      if (resendCountdownEl) {
        resendCountdownEl.textContent = '✅ Sẵn sàng';
      }
    }

    secondsLeft--;
  };

  updateResendCountdown();
  resendCountdownInterval = setInterval(updateResendCountdown, 1000);
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

    // Move to step 2 and send OTP automatically
    showStep(2);
    sendOTP();
  });
}

// ========= STEP 2: EMAIL OTP VERIFICATION =========

/**
 * Send OTP to email
 */
async function sendOTP() {
  const step2Msg = document.getElementById('step2Msg');
  const resendBtn = document.getElementById('resendOtpBtn');

  step2Msg.textContent = '⏳ Đang gửi mã OTP...';
  step2Msg.style.color = '#fff';

  try {
    const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: registrationData.email })
    });

    const data = await response.json();

    if (!response.ok) {
      step2Msg.textContent = '❌ ' + (data.message || 'Không thể gửi OTP');
      step2Msg.style.color = '#f87171';
      return;
    }

    // ✅ Get expiration time from server
    otpExpireAt = data.expireAt;
    otpAttemptsLeft = 3;

    step2Msg.textContent = '✅ Mã OTP đã được gửi đến email của bạn';
    step2Msg.style.color = '#4ade80';

    // Start countdown timer
    startCountdown();

    // Start resend countdown
    if (resendBtn) {
      resendBtn.disabled = true;
      resendBtn.style.opacity = '0.5';
      startResendCountdown();
    }

    console.log('[OTP] ✅ OTP sent successfully');
  } catch (err) {
    console.error('[OTP SEND] Error:', err.message);
    step2Msg.textContent = '❌ Lỗi: ' + err.message;
    step2Msg.style.color = '#f87171';
  }
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

// Verify OTP button
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

    try {
      step2Msg.textContent = '⏳ Đang xác thực...';
      step2Msg.style.color = '#fff';
      verifyOtpBtn.disabled = true;

      const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registrationData.email,
          otp: otpCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        otpError.textContent = data.message || 'Xác thực thất bại';
        if (data.attemptsLeft !== undefined) {
          otpAttemptsLeft = data.attemptsLeft;
        }
        verifyOtpBtn.disabled = false;
        return;
      }

      // ✅ OTP verified successfully
      step2Msg.textContent = '✅ Xác thực thành công! Đang chuyển bước...';
      step2Msg.style.color = '#4ade80';

      // Clear countdown
      if (countdownInterval) clearInterval(countdownInterval);

      setTimeout(() => showStep(3), 1000);

    } catch (err) {
      console.error('[OTP VERIFY] Error:', err.message);
      otpError.textContent = '❌ Lỗi: ' + err.message;
      verifyOtpBtn.disabled = false;
    }
  });
}

// Resend OTP button
const resendOtpBtn = document.getElementById('resendOtpBtn');
if (resendOtpBtn) {
  resendOtpBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const step2Msg = document.getElementById('step2Msg');

    step2Msg.textContent = '⏳ Đang gửi lại mã OTP...';
    step2Msg.style.color = '#fff';

    try {
      const response = await fetch(`${API_BASE}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registrationData.email })
      });

      const data = await response.json();

      if (!response.ok) {
        step2Msg.textContent = '❌ ' + (data.message || 'Không thể gửi lại OTP');
        step2Msg.style.color = '#f87171';
        return;
      }

      // ✅ Get new expiration time
      otpExpireAt = data.expireAt;
      otpAttemptsLeft = 3; // Reset attempts
      document.getElementById('otpCode').value = ''; // Clear input
      document.getElementById('otpError').textContent = '';

      step2Msg.textContent = '✅ Mã OTP mới đã được gửi đến email của bạn';
      step2Msg.style.color = '#4ade80';

      // Restart countdown
      startCountdown();
      startResendCountdown();

      resendOtpBtn.disabled = true;
      resendOtpBtn.style.opacity = '0.5';

      console.log('[OTP RESEND] ✅ OTP resent successfully. Resend count:', data.resendCount);
    } catch (err) {
      console.error('[OTP RESEND] Error:', err.message);
      step2Msg.textContent = '❌ Lỗi: ' + err.message;
      step2Msg.style.color = '#f87171';
    }
  });
}

// Back button from step 2
const backBtn2 = document.getElementById('backBtn2');
if (backBtn2) {
  backBtn2.addEventListener('click', (e) => {
    e.preventDefault();

    // Clear countdowns
    if (countdownInterval) clearInterval(countdownInterval);
    if (resendCountdownInterval) clearInterval(resendCountdownInterval);

    // Reset step 2 UI
    document.getElementById('otpCode').value = '';
    document.getElementById('otpError').textContent = '';
    document.getElementById('step2Msg').textContent = '';

    const resendBtn = document.getElementById('resendOtpBtn');
    if (resendBtn) {
      resendBtn.disabled = true;
      resendBtn.style.opacity = '0.5';
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
          emailVerified: true
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

// ========= OTP INPUT VALIDATION =========
const otpInput = document.getElementById('otpCode');
if (otpInput) {
  otpInput.addEventListener('input', function () {
    // Only allow numbers
    this.value = this.value.replace(/\D/g, '').slice(0, 6);
  });
}

console.log('[INIT] ✅ Register.js initialized - Email OTP Flow Ready');