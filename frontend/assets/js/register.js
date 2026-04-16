const API_BASE = 'https://sentinelvn.onrender.com';

console.log('[INIT] Register.js loaded - Updated Registration Flow (Personal Info → Choose Method → Email/Phone OTP → Password → Success)');
document.getElementById('year').textContent = new Date().getFullYear();

// ========= STATE =========
let registrationData = {};
let currentStep = 1;
let verificationMethod = null; // 'email' or 'phone'
let countdownInterval = null;
let resendCountdownInterval = null;
let otpExpireAt = null;
let otpAttemptsLeft = 3;
let confirmationResult = null; // For Firebase phone verification
let auth = null;
let firebaseInitialized = false;

// ========= FIREBASE INITIALIZATION =========
async function initFirebase() {
	try {
		const firebaseConfig = {
			apiKey: "AIzaSyDvCn-tP5OJEZ9S_LIFcxSG6MoYvmM_1Gg",
			authDomain: "sentinelvn-2fb6f.firebaseapp.com",
			projectId: "sentinelvn-2fb6f",
			storageBucket: "sentinelvn-2fb6f.appspot.com",
			messagingSenderId: "881888145051",
			appId: "1:881888145051:web:b6b5c10c6a51f6fcb0f4ad"
		};

		if (!firebase.apps.length) {
			firebase.initializeApp(firebaseConfig);
		}

		auth = firebase.auth();
		firebaseInitialized = true;
		console.log('[FIREBASE] ✅ Firebase initialized');

		// Initialize reCAPTCHA for phone auth when needed
		window.recaptchaVerifier = null;
	} catch (err) {
		console.error('[FIREBASE] ❌ Error initializing Firebase:', err);
	}
}

function initRecaptcha() {
	if (window.recaptchaVerifier) return; // Already initialized

	try {
		window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptchaContainer', {
			size: 'normal',
			callback: (response) => {
				console.log('[RECAPTCHA] ✅ reCAPTCHA verified');
			},
			'expired-callback': () => {
				console.warn('[RECAPTCHA] reCAPTCHA expired');
			}
		});

		window.recaptchaVerifier.render().then(() => {
			console.log('[RECAPTCHA] ✅ reCAPTCHA rendered');
		});
	} catch (err) {
		console.error('[RECAPTCHA] Error:', err.message);
	}
}

// Initialize Firebase when page loads
window.addEventListener('load', initFirebase);

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
	document.getElementById('step3aContainer').style.display = 'none';
	document.getElementById('step3bContainer').style.display = 'none';
	document.getElementById('step4Container').style.display = 'none';
	document.getElementById('step5Container').style.display = 'none';

	// Show the target step
	if (step === 1) {
		document.getElementById('step1Form').style.display = 'block';
	} else if (step === 2) {
		document.getElementById('step2Container').style.display = 'block';
	} else if (step === 3) {
		if (verificationMethod === 'email') {
			document.getElementById('step3aContainer').style.display = 'block';
		} else if (verificationMethod === 'phone') {
			document.getElementById('step3bContainer').style.display = 'block';
			// Initialize reCAPTCHA for phone auth
			setTimeout(initRecaptcha, 100);
		}
	} else if (step === 4) {
		document.getElementById('step4Container').style.display = 'block';
	} else if (step === 5) {
		document.getElementById('step5Container').style.display = 'block';
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
		const city = document.getElementById('city').value.trim();
		const step1Msg = document.getElementById('step1Msg');

		step1Msg.textContent = '';

		if (!firstName || !lastName || !gender || !city) {
			step1Msg.textContent = '⚠️ Vui lòng điền đầy đủ thông tin.';
			step1Msg.style.color = '#f87171';
			return;
		}

		registrationData = {
			firstName,
			lastName,
			fullName: `${firstName} ${lastName}`,
			gender,
			city
		};

		console.log('[STEP 1] ✅ Personal info saved:', registrationData);
		showStep(2);
	});
}

// ========= STEP 2: CHOOSE VERIFICATION METHOD =========
const emailMethodBtn = document.getElementById('emailMethodBtn');
const phoneMethodBtn = document.getElementById('phoneMethodBtn');
const backBtn2Method = document.getElementById('backBtn2Method');

if (emailMethodBtn) {
	emailMethodBtn.addEventListener('click', (e) => {
		e.preventDefault();
		verificationMethod = 'email';
		console.log('[STEP 2] ✅ Selected: Email verification');
		showStep(3);
	});
}

if (phoneMethodBtn) {
	phoneMethodBtn.addEventListener('click', (e) => {
		e.preventDefault();
		if (!firebaseInitialized) {
			alert('⏳ Vui lòng chờ Firebase khởi tạo...');
			return;
		}
		verificationMethod = 'phone';
		console.log('[STEP 2] ✅ Selected: Phone verification');
		showStep(3);
	});
}

if (backBtn2Method) {
	backBtn2Method.addEventListener('click', (e) => {
		e.preventDefault();
		verificationMethod = null;
		showStep(1);
	});
}

// ========= STEP 3A: EMAIL VERIFICATION =========

/**
 * Send OTP to email
 */
async function sendEmailOTP() {
	const email = document.getElementById('emailInput').value.trim().toLowerCase();
	const step3aMsg = document.getElementById('step3aMsg');
	const sendEmailOtpBtn = document.getElementById('sendEmailOtpBtn');

	step3aMsg.textContent = '';

	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		step3aMsg.textContent = '⚠️ Email không hợp lệ.';
		step3aMsg.style.color = '#f87171';
		return;
	}

	step3aMsg.textContent = '⏳ Đang gửi mã OTP...';
	step3aMsg.style.color = '#fff';
	sendEmailOtpBtn.disabled = true;

	try {
		const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email })
		});

		const data = await response.json();

		if (!response.ok) {
			step3aMsg.textContent = '❌ ' + (data.message || 'Không thể gửi OTP');
			step3aMsg.style.color = '#f87171';
			sendEmailOtpBtn.disabled = false;
			return;
		}

		registrationData.email = email;
		otpExpireAt = data.expireAt;
		otpAttemptsLeft = 3;

		step3aMsg.textContent = '✅ Mã OTP đã được gửi đến email của bạn';
		step3aMsg.style.color = '#4ade80';

		// Show OTP input section
		document.getElementById('otpInputSection').style.display = 'grid';
		document.getElementById('resendSection').style.display = 'flex';

		startCountdown();
		startResendCountdown();

		console.log('[EMAIL OTP] ✅ OTP sent successfully');
	} catch (err) {
		console.error('[EMAIL OTP SEND] Error:', err.message);
		step3aMsg.textContent = '❌ Lỗi: ' + err.message;
		step3aMsg.style.color = '#f87171';
	} finally {
		sendEmailOtpBtn.disabled = false;
	}
}

// ========= STEP 2: EMAIL OTP VERIFICATION =========
// Send Email OTP button
const sendEmailOtpBtn = document.getElementById('sendEmailOtpBtn');
if (sendEmailOtpBtn) {
	sendEmailOtpBtn.addEventListener('click', (e) => {
		e.preventDefault();
		sendEmailOTP();
	});
}

// ========= STEP 3B: PHONE VERIFICATION =========

// Send Phone OTP button
const sendPhoneOtpBtn = document.getElementById('sendPhoneOtpBtn');
if (sendPhoneOtpBtn) {
	sendPhoneOtpBtn.addEventListener('click', async (e) => {
		e.preventDefault();

		const phone = document.getElementById('phone').value.trim().replace(/\D/g, '');
		const phoneError = document.getElementById('phoneError');
		const step3bMsg = document.getElementById('step3bMsg');

		step3bMsg.textContent = '';
		phoneError.classList.add('hidden');

		if (!/^\d{10}$/.test(phone)) {
			phoneError.classList.remove('hidden');
			return;
		}

		if (!auth) {
			console.error('[PHONE OTP] Auth not initialized');
			step3bMsg.textContent = '❌ Firebase chưa khởi tạo. Vui lòng tải lại trang.';
			step3bMsg.style.color = '#f87171';
			return;
		}

		if (!window.recaptchaVerifier) {
			step3bMsg.textContent = '❌ reCAPTCHA chưa sẵn sàng. Vui lòng chờ...';
			step3bMsg.style.color = '#f87171';
			initRecaptcha();
			return;
		}

		try {
			step3bMsg.textContent = '⏳ Đang gửi mã OTP...';
			step3bMsg.style.color = '#fff';
			sendPhoneOtpBtn.disabled = true;

			const phoneNumber = '+84' + phone.substring(1);
			console.log('[PHONE OTP] Sending OTP to:', phoneNumber);

			confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier);

			registrationData.phone = phone;

			step3bMsg.textContent = '✅ Mã OTP đã được gửi!';
			step3bMsg.style.color = '#4ade80';

			document.getElementById('phoneOtpInputSection').style.display = 'grid';
			sendPhoneOtpBtn.style.opacity = '0.5';

		} catch (err) {
			console.error('[PHONE OTP] Error:', err.code, err.message);
			step3bMsg.textContent = '❌ ' + (err.message || 'Không thể gửi OTP. Vui lòng thử lại.');
			step3bMsg.style.color = '#f87171';
			sendPhoneOtpBtn.disabled = false;

			if (window.recaptchaVerifier) {
				window.recaptchaVerifier.clear();
				window.recaptchaVerifier = null;
			}
			initRecaptcha();
		}
	});
}

// Verify OTP button
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
if (verifyOtpBtn) {
	verifyOtpBtn.addEventListener('click', async (e) => {
		e.preventDefault();

		const otpCode = document.getElementById('otpCode').value.trim();
		const otpError = document.getElementById('otpError');
		const step3aMsg = document.getElementById('step3aMsg');

		otpError.textContent = '';

		if (!/^\d{6}$/.test(otpCode)) {
			otpError.textContent = 'Mã OTP phải là 6 chữ số';
			return;
		}

		try {
			step3aMsg.textContent = '⏳ Đang xác thực...';
			step3aMsg.style.color = '#fff';
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
			step3aMsg.textContent = '✅ Xác thực thành công! Đang chuyển bước...';
			step3aMsg.style.color = '#4ade80';

			if (countdownInterval) clearInterval(countdownInterval);

			setTimeout(() => showStep(4), 1000);

		} catch (err) {
			console.error('[EMAIL OTP VERIFY] Error:', err.message);
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

		const step3aMsg = document.getElementById('step3aMsg');

		step3aMsg.textContent = '⏳ Đang gửi lại mã OTP...';
		step3aMsg.style.color = '#fff';

		try {
			const response = await fetch(`${API_BASE}/api/auth/resend-otp`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: registrationData.email })
			});

			const data = await response.json();

			if (!response.ok) {
				step3aMsg.textContent = '❌ ' + (data.message || 'Không thể gửi lại OTP');
				step3aMsg.style.color = '#f87171';
				return;
			}

			otpExpireAt = data.expireAt;
			otpAttemptsLeft = 3;
			document.getElementById('otpCode').value = '';
			document.getElementById('otpError').textContent = '';

			step3aMsg.textContent = '✅ Mã OTP mới đã được gửi đến email của bạn';
			step3aMsg.style.color = '#4ade80';

			startCountdown();
			startResendCountdown();

			resendOtpBtn.disabled = true;
			resendOtpBtn.style.opacity = '0.5';

			console.log('[EMAIL OTP RESEND] ✅ OTP resent successfully');
		} catch (err) {
			console.error('[EMAIL OTP RESEND] Error:', err.message);
			step3aMsg.textContent = '❌ Lỗi: ' + err.message;
			step3aMsg.style.color = '#f87171';
		}
	});
}

// Back button from step 3a
const backBtn3a = document.getElementById('backBtn3a');
if (backBtn3a) {
	backBtn3a.addEventListener('click', (e) => {
		e.preventDefault();

		if (countdownInterval) clearInterval(countdownInterval);
		if (resendCountdownInterval) clearInterval(resendCountdownInterval);

		document.getElementById('emailInput').value = '';
		document.getElementById('otpCode').value = '';
		document.getElementById('otpError').textContent = '';
		document.getElementById('step3aMsg').textContent = '';
		document.getElementById('otpInputSection').style.display = 'none';
		document.getElementById('resendSection').style.display = 'none';

		showStep(2);
	});
}

// Verify Phone OTP button
const verifyPhoneOtpBtn = document.getElementById('verifyPhoneOtpBtn');
if (verifyPhoneOtpBtn) {
	verifyPhoneOtpBtn.addEventListener('click', async (e) => {
		e.preventDefault();

		const phoneOtpCode = document.getElementById('phoneOtpCode').value.trim();
		const phoneOtpError = document.getElementById('phoneOtpError');
		const step3bMsg = document.getElementById('step3bMsg');

		phoneOtpError.textContent = '';

		if (!phoneOtpCode || phoneOtpCode.length < 6) {
			phoneOtpError.textContent = 'Vui lòng nhập mã OTP';
			return;
		}

		try {
			step3bMsg.textContent = '⏳ Đang xác thực...';
			step3bMsg.style.color = '#fff';
			verifyPhoneOtpBtn.disabled = true;

			const result = await confirmationResult.confirm(phoneOtpCode);
			const user = result.user;

			console.log('[PHONE OTP] ✅ Phone verified:', user.phoneNumber);

			// Mark email as verified (since phone is verified, we can consider account verified)
			registrationData.emailVerified = true;

			step3bMsg.textContent = '✅ Xác thực thành công! Đang chuyển bước...';
			step3bMsg.style.color = '#4ade80';

			setTimeout(() => showStep(4), 1000);

		} catch (err) {
			console.error('[PHONE OTP VERIFY] Error:', err.code, err.message);
			phoneOtpError.textContent = '❌ Mã OTP không chính xác';
			verifyPhoneOtpBtn.disabled = false;
		}
	});
}

// Back button from step 3b
const backBtn3b = document.getElementById('backBtn3b');
if (backBtn3b) {
	backBtn3b.addEventListener('click', (e) => {
		e.preventDefault();

		document.getElementById('phone').value = '';
		document.getElementById('phoneOtpCode').value = '';
		document.getElementById('phoneError').classList.add('hidden');
		document.getElementById('phoneOtpError').textContent = '';
		document.getElementById('step3bMsg').textContent = '';
		document.getElementById('phoneOtpInputSection').style.display = 'none';

		showStep(2);
	});
}

// ========= STEP 4: PASSWORD =========
const step4Form = document.getElementById('step4Form');
if (step4Form) {
	step4Form.addEventListener('submit', async (e) => {
		e.preventDefault();

		const password = document.getElementById('password').value;
		const passwordConfirm = document.getElementById('passwordConfirm').value;
		const step4Msg = document.getElementById('step4Msg');
		const passwordError = document.getElementById('passwordError');

		step4Msg.textContent = '';
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
		showStep(5);

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
					emailVerified: registrationData.emailVerified || (verificationMethod === 'email'),
					phoneVerified: verificationMethod === 'phone'
				})
			});

			const registerData = await registerRes.json();

			if (!registerRes.ok) {
				const step5Msg = document.getElementById('step5Msg');
				step5Msg.textContent = '❌ ' + (registerData.message || 'Đăng ký thất bại');
				step5Msg.style.color = '#f87171';
				document.getElementById('loadingSpinner').style.display = 'none';
				console.error('[REGISTER] Error:', registerData.message);
				return;
			}

			const step5Msg = document.getElementById('step5Msg');
			step5Msg.textContent = '✅ Đăng ký thành công! Đang chuyển hướng...';
			step5Msg.style.color = '#4ade80';
			document.getElementById('loadingSpinner').textContent = '✅';
			document.getElementById('loadingSpinner').style.animation = 'none';

			console.log('[REGISTER] ✅ Registration successful');

			setTimeout(() => {
				window.location.href = 'client.html';
			}, 2000);

		} catch (err) {
			console.error('[REGISTER] Error:', err.message);
			const step5Msg = document.getElementById('step5Msg');
			step5Msg.textContent = '❌ Lỗi server: ' + err.message;
			step5Msg.style.color = '#f87171';
			document.getElementById('loadingSpinner').style.display = 'none';
		}
	});
}

// Back button from step 4
const backBtn4 = document.getElementById('backBtn4');
if (backBtn4) {
	backBtn4.addEventListener('click', (e) => {
		e.preventDefault();

		document.getElementById('password').value = '';
		document.getElementById('passwordConfirm').value = '';
		document.getElementById('password').type = 'password';
		document.getElementById('passwordConfirm').type = 'password';
		document.getElementById('togglePassword').textContent = '👁️';
		document.getElementById('togglePasswordConfirm').textContent = '👁️';
		document.getElementById('passwordError').textContent = '';
		document.getElementById('passwordMismatch').classList.add('hidden');
		document.getElementById('step4Msg').textContent = '';

		showStep(3);
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
				togglePassword.textContent = '👁️';
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
				togglePasswordConfirm.textContent = '👁️';
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