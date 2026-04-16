const API_BASE = 'https://sentinelvn.onrender.com';

console.log('[INIT] Register.js loaded - 3-Step Registration Flow with Tabs');
document.getElementById('year').textContent = new Date().getFullYear();

// ========= STATE =========
let registrationData = {};
let currentStep = 1;
let verificationMethod = null; // 'email' or 'phone'
let currentTab = 'phone'; // 'phone' or 'email'
let countdownInterval = null;
let resendCountdownInterval = null;
let otpExpireAt = null;
let otpAttemptsLeft = 3;
let confirmationResult = null;


// ========= FIREBASE INITIALIZATION =========
function getAuthSafe() {
  const auth = window.firebaseAuth;
  if (!auth) {
    console.error('[FIREBASE] ❌ Auth chưa sẵn sàng');
    return null;
  }
  return auth;
}
if (window.firebaseAuth) {
  console.log('[FIREBASE] ✅ Firebase v9 ready');
} else {
  console.warn('[FIREBASE] ⏳ Firebase chưa sẵn sàng');
}

function initRecaptcha() {
  if (window.recaptchaVerifier) return;

  const auth = getAuthSafe();
  if (!auth) return;

  try {
    window.recaptchaVerifier = new window.RecaptchaVerifier(
      'recaptchaContainer',
      {
        size: 'normal',
        callback: () => console.log('[RECAPTCHA] ✅ verified'),
        'expired-callback': () => console.warn('[RECAPTCHA] expired')
      },
      auth
    );

    window.recaptchaVerifier.render().then(() => {
      console.log('[RECAPTCHA] ✅ rendered');
    });

  } catch (err) {
    console.error('[RECAPTCHA] Error:', err.message);
  }
}



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
    // Initialize tabs for step 2
    setTimeout(initStep2, 100);
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

// ========= STEP 1: PERSONAL INFO =========
const step1Form = document.getElementById('step1Form');
if (step1Form) {
  step1Form.addEventListener('submit', (e) => {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const gender = document.getElementById('gender').value;
    const dateOfBirth = document.getElementById('dateOfBirth').value;
    const city = document.getElementById('city').value.trim();
    const step1Msg = document.getElementById('step1Msg');

    step1Msg.textContent = '';

    if (!firstName || !lastName || !gender || !dateOfBirth || !city) {
      step1Msg.textContent = '⚠️ Vui lòng điền đầy đủ thông tin.';
      step1Msg.style.color = '#f87171';
      return;
    }

    registrationData = {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      gender,
      dateOfBirth,
      city
    };

    console.log('[STEP 1] ✅ Personal info saved:', registrationData);
    showStep(2);
  });
}

// ========= STEP 2: TAB SWITCHING (Phone vs Email) =========
const phoneTab = document.getElementById('phoneTab');
const emailTab = document.getElementById('emailTab');
const phoneTabContent = document.getElementById('phoneTabContent');
const emailTabContent = document.getElementById('emailTabContent');
const backBtn2 = document.getElementById('backBtn2');

function switchTab(tabName) {
  currentTab = tabName;

  if (tabName === 'phone') {
    // Activate phone tab
    phoneTab.classList.remove('border-white/20', 'text-white/60');
    phoneTab.classList.add('border-brand-400', 'bg-brand-400/20', 'text-white');
    phoneTabContent.style.display = 'block';

    // Deactivate email tab
    emailTab.classList.remove('border-brand-400', 'bg-brand-400/20', 'text-white');
    emailTab.classList.add('border-white/20', 'text-white/60');
    emailTabContent.style.display = 'none';

    // Initialize reCAPTCHA for phone
    initRecaptcha();
    console.log('[STEP 2] ✅ Switched to Phone tab');
  } else if (tabName === 'email') {
    // Activate email tab
    emailTab.classList.remove('border-white/20', 'text-white/60');
    emailTab.classList.add('border-brand-400', 'bg-brand-400/20', 'text-white');
    emailTabContent.style.display = 'block';

    // Deactivate phone tab
    phoneTab.classList.remove('border-brand-400', 'bg-brand-400/20', 'text-white');
    phoneTab.classList.add('border-white/20', 'text-white/60');
    phoneTabContent.style.display = 'none';

    console.log('[STEP 2] ✅ Switched to Email tab');
  }
}

if (phoneTab) {
  phoneTab.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('phone');
  });
}

if (emailTab) {
  emailTab.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('email');
  });
}

if (backBtn2) {
  backBtn2.addEventListener('click', (e) => {
    e.preventDefault();
    // Reset registration data to step 1
    registrationData = {};
    currentTab = 'phone';
    showStep(1);
  });
}

// Initialize phone tab as default when showing step 2
function initStep2() {
  if (!window.firebaseAuth) {
    console.warn('[STEP 2] Firebase chưa sẵn sàng, retry...');
    setTimeout(initStep2, 300);
    return;
  }
  switchTab('phone');
}

// ========= STEP 2: EMAIL OTP - Send Email OTP =========

/**
 * Send OTP to email - Step 2 Email Tab
 */
async function sendEmailOTP() {
  const email = document.getElementById('emailInput').value.trim().toLowerCase();
  const step2EmailMsg = document.getElementById('step2EmailMsg');
  const sendEmailOtpBtn = document.getElementById('sendEmailOtpBtn');

  step2EmailMsg.textContent = '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    step2EmailMsg.textContent = '⚠️ Email không hợp lệ.';
    step2EmailMsg.style.color = '#f87171';
    return;
  }

  step2EmailMsg.textContent = '⏳ Đang gửi mã OTP...';
  step2EmailMsg.style.color = '#fff';
  sendEmailOtpBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      step2EmailMsg.textContent = '❌ ' + (data.message || 'Không thể gửi OTP');
      step2EmailMsg.style.color = '#f87171';
      sendEmailOtpBtn.disabled = false;
      return;
    }

    registrationData.email = email;
    otpExpireAt = data.expireAt;
    otpAttemptsLeft = 3;

    step2EmailMsg.textContent = '✅ Mã OTP đã được gửi đến email của bạn';
    step2EmailMsg.style.color = '#4ade80';

    // Show OTP input section
    document.getElementById('emailOtpInputSection').style.display = 'grid';
    document.getElementById('resendSection').style.display = 'flex';

    startCountdown();
    startResendCountdown();

    console.log('[EMAIL OTP] ✅ OTP sent successfully');
  } catch (err) {
    console.error('[EMAIL OTP SEND] Error:', err.message);
    step2EmailMsg.textContent = '❌ Lỗi: ' + err.message;
    step2EmailMsg.style.color = '#f87171';
  } finally {
    sendEmailOtpBtn.disabled = false;
  }
}

// Wire up Send Email OTP button
const sendEmailOtpBtn = document.getElementById('sendEmailOtpBtn');
if (sendEmailOtpBtn) {
  sendEmailOtpBtn.addEventListener('click', (e) => {
    e.preventDefault();
    sendEmailOTP();
  });
}

// ========= STEP 2: PHONE OTP - Send Phone OTP =========

// Send Phone OTP button
const sendPhoneOtpBtn = document.getElementById('sendPhoneOtpBtn');
if (sendPhoneOtpBtn) {
  sendPhoneOtpBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const phone = document.getElementById('phone').value.trim().replace(/\D/g, '');
    const phoneError = document.getElementById('phoneError');
    const step2PhoneMsg = document.getElementById('step2PhoneMsg');

    step2PhoneMsg.textContent = '';
    phoneError.classList.add('hidden');

    if (!/^\d{10}$/.test(phone)) {
      phoneError.classList.remove('hidden');
      return;
    }
    const auth = getAuthSafe();
    if (!auth) {
      console.error('[PHONE OTP] Auth not initialized');
      step2PhoneMsg.textContent = '❌ Firebase chưa khởi tạo. Vui lòng tải lại trang.';
      step2PhoneMsg.style.color = '#f87171';
      return;
    }

    if (!window.recaptchaVerifier) {
      step2PhoneMsg.textContent = '❌ reCAPTCHA chưa sẵn sàng. Vui lòng chờ...';
      step2PhoneMsg.style.color = '#f87171';
      initRecaptcha();
      return;
    }

    try {
      step2PhoneMsg.textContent = '⏳ Đang gửi mã OTP...';
      step2PhoneMsg.style.color = '#fff';
      sendPhoneOtpBtn.disabled = true;

      const phoneNumber = '+84' + phone.substring(1);
      console.log('[PHONE OTP] Sending OTP to:', phoneNumber);
      confirmationResult = await window.signInWithPhoneNumber(
        auth,
        phoneNumber,
        window.recaptchaVerifier
      );
      registrationData.phone = phone;
      step2PhoneMsg.textContent = '✅ Mã OTP đã được gửi!';
      step2PhoneMsg.style.color = '#4ade80';
      document.getElementById('phoneOtpInputSection').style.display = 'grid';
      sendPhoneOtpBtn.style.opacity = '0.5';
    } catch (err) {
      console.error('[PHONE OTP] Error:', err.code, err.message);
      step2PhoneMsg.textContent = '❌ ' + (err.message || 'Không thể gửi OTP. Vui lòng thử lại.');
      step2PhoneMsg.style.color = '#f87171';
      sendPhoneOtpBtn.disabled = false;
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      initRecaptcha();
    }
  });
}
// ========= STEP 2: EMAIL OTP - Verify Email OTP =========
// Verify Email OTP button
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
if (verifyOtpBtn) {
  verifyOtpBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const otpCode = document.getElementById('otpCode').value.trim();
    const otpError = document.getElementById('otpError');
    const step2EmailMsg = document.getElementById('step2EmailMsg');
    const continueBtn2 = document.getElementById('continueBtn2');
    otpError.textContent = '';
    if (!/^\d{6}$/.test(otpCode)) {
      otpError.textContent = 'Mã OTP phải là 6 chữ số';
      return;
    }
    try {
      step2EmailMsg.textContent = '⏳ Đang xác thực...';
      step2EmailMsg.style.color = '#fff';
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
      step2EmailMsg.textContent = '✅ Xác thực thành công!';
      step2EmailMsg.style.color = '#4ade80';
      registrationData.emailVerified = true;

      if (countdownInterval) clearInterval(countdownInterval);

      // Enable continue button
      continueBtn2.disabled = false;
      continueBtn2.style.opacity = '1';

    } catch (err) {
      console.error('[EMAIL OTP VERIFY] Error:', err.message);
      otpError.textContent = '❌ Lỗi: ' + err.message;
      verifyOtpBtn.disabled = false;
    }
  });
}

// Resend Email OTP button
const resendOtpBtn = document.getElementById('resendOtpBtn');
if (resendOtpBtn) {
  resendOtpBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const step2EmailMsg = document.getElementById('step2EmailMsg');

    step2EmailMsg.textContent = '⏳ Đang gửi lại mã OTP...';
    step2EmailMsg.style.color = '#fff';

    try {
      const response = await fetch(`${API_BASE}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registrationData.email })
      });

      const data = await response.json();

      if (!response.ok) {
        step2EmailMsg.textContent = '❌ ' + (data.message || 'Không thể gửi lại OTP');
        step2EmailMsg.style.color = '#f87171';
        return;
      }

      otpExpireAt = data.expireAt;
      otpAttemptsLeft = 3;
      document.getElementById('otpCode').value = '';
      document.getElementById('otpError').textContent = '';

      step2EmailMsg.textContent = '✅ Mã OTP mới đã được gửi đến email của bạn';
      step2EmailMsg.style.color = '#4ade80';

      startCountdown();
      startResendCountdown();

      resendOtpBtn.disabled = true;
      resendOtpBtn.style.opacity = '0.5';

      console.log('[EMAIL OTP RESEND] ✅ OTP resent successfully');
    } catch (err) {
      console.error('[EMAIL OTP RESEND] Error:', err.message);
      step2EmailMsg.textContent = '❌ Lỗi: ' + err.message;
      step2EmailMsg.style.color = '#f87171';
    }
  });
}

// ========= STEP 2: PHONE OTP - Verify Phone OTP =========

// Verify Phone OTP button
const verifyPhoneOtpBtn = document.getElementById('verifyPhoneOtpBtn');
if (verifyPhoneOtpBtn) {
  verifyPhoneOtpBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const phoneOtpCode = document.getElementById('phoneOtpCode').value.trim();
    const phoneOtpError = document.getElementById('phoneOtpError');
    const step2PhoneMsg = document.getElementById('step2PhoneMsg');
    const continueBtn2 = document.getElementById('continueBtn2');

    phoneOtpError.textContent = '';

    if (!/^\d{6}$/.test(phoneOtpCode)) {
      phoneOtpError.textContent = 'Mã OTP phải là 6 chữ số';
      return;
    }

    if (!confirmationResult) {
      phoneOtpError.textContent = '❌ Something went wrong. Please try again.';
      return;
    }

    try {
      step2PhoneMsg.textContent = '⏳ Đang xác thực...';
      step2PhoneMsg.style.color = '#fff';
      verifyPhoneOtpBtn.disabled = true;

      const credential = await confirmationResult.confirm(phoneOtpCode);
      registrationData.phoneVerified = true;

      step2PhoneMsg.textContent = '✅ Xác thực thành công!';
      step2PhoneMsg.style.color = '#4ade80';

      // Enable continue button
      continueBtn2.disabled = false;
      continueBtn2.style.opacity = '1';

      console.log('[PHONE OTP VERIFY] ✅ Phone verified:', credential.user.uid);

    } catch (err) {
      console.error('[PHONE OTP VERIFY] Error:', err.message);
      phoneOtpError.textContent = '❌ ' + (err.message || 'Xác thực thất bại');
      verifyPhoneOtpBtn.disabled = false;
    }
  });
}

// Continue button from step 2
const continueBtn2 = document.getElementById('continueBtn2');
if (continueBtn2) {
  continueBtn2.addEventListener('click', (e) => {
    e.preventDefault();
    showStep(3);
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
          dateOfBirth: registrationData.dateOfBirth,
          city: registrationData.city,
          phone: registrationData.phone || null,
          emailVerified: registrationData.emailVerified || false,
          phoneVerified: registrationData.phoneVerified || false
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

      console.log('[REGISTER] ✅ Registration successful');

      setTimeout(() => {
        window.location.href = 'index.html';
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

// Back button from step 3
const backBtn3 = document.getElementById('backBtn3');
if (backBtn3) {
  backBtn3.addEventListener('click', (e) => {
    e.preventDefault();

    document.getElementById('password').value = '';
    document.getElementById('passwordConfirm').value = '';
    document.getElementById('password').type = 'password';
    document.getElementById('passwordConfirm').type = 'password';
    document.getElementById('togglePassword').textContent = '👁️‍🗨️';
    document.getElementById('togglePasswordConfirm').textContent = '👁️‍🗨️';
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

    if (password && password !== passwordConfirmInput.value) {
      mismatchEl.classList.remove('hidden');
      passwordConfirmInput.style.borderColor = '#f87171';
    } else {
      mismatchEl.classList.add('hidden');
      passwordConfirmInput.style.borderColor = '';
    }
  });
}

// ========= PASSWORD VISIBILITY TOGGLE =========
document.addEventListener('DOMContentLoaded', () => {
  const togglePassword = document.getElementById('togglePassword');
  const togglePasswordConfirm = document.getElementById('togglePasswordConfirm');
  const passwordInput = document.getElementById('password');
  const passwordConfirmInput = document.getElementById('passwordConfirm');

  if (togglePassword) {
    togglePassword.addEventListener('click', (e) => {
      e.preventDefault();
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePassword.textContent = '🙈';
      } else {
        passwordInput.type = 'password';
        togglePassword.textContent = '👁️‍🗨️';
      }
    });
  }

  if (togglePasswordConfirm) {
    togglePasswordConfirm.addEventListener('click', (e) => {
      e.preventDefault();
      if (passwordConfirmInput.type === 'password') {
        passwordConfirmInput.type = 'text';
        togglePasswordConfirm.textContent = '🙈';
      } else {
        passwordConfirmInput.type = 'password';
        togglePasswordConfirm.textContent = '👁️‍🗨️';
      }
    });
  }
});

// ========= OTP INPUT VALIDATION =========
const otpInput = document.getElementById('otpCode');
if (otpInput) {
  otpInput.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 6);
  });
}

const phoneOtpInput = document.getElementById('phoneOtpCode');
if (phoneOtpInput) {
  phoneOtpInput.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 6);
  });
}

console.log('[INIT] ✅ Register.js initialized - New Registration Flow Ready');