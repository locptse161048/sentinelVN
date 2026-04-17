document.getElementById('year').textContent = new Date().getFullYear();
const API_BASE = 'https://sentinelvn.onrender.com';

// ✅ Monkey-patch fetch to auto-add Authorization header (if not already present)
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const [resource, config = {}] = args;
    const token = localStorage.getItem('auth_token');
    
    if (token && (!config.headers || !config.headers['Authorization'])) {
        config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    
    // Remove credentials since we're using headers now
    if (config.credentials) {
        delete config.credentials;
    }
    
    return originalFetch.apply(this, [resource, config]);
};

// ========= Auth session check on page load =========
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // 🔑 Get token from localStorage
        const token = localStorage.getItem('auth_token');
        console.log('[SESSION CHECK] Token from localStorage:', token ? token.substring(0, 30) + '...' : 'missing');
        
        if (!token) {
            console.log('[SESSION CHECK] No token, user not logged in');
            setLoggedOutUI();
            return;
        }
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        // ✅ Send token via Authorization header
        const res = await fetch(`${API_BASE}/api/auth/session`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!res.ok) {
            console.warn('[SESSION CHECK] Session validation failed:', res.status);
            localStorage.removeItem('auth_token');  // Clear invalid token
            setLoggedOutUI();
            return;
        }
        
        const user = await res.json();
        console.log('[SESSION CHECK] User verified:', user.email, 'Role:', user.role);
        await setLoggedInUI(user);
        setupAccountButtons(user);
    } catch (err) {
        console.warn("Session check failed on page load:", err.message);
        setLoggedOutUI();
    }
});

// ========= Helpers =========
const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => Array.from(root.querySelectorAll(q));
const fmtDate = ts => new Date(ts).toLocaleDateString('vi-VN');
const addDays = (ts, days) => new Date(ts + days * 24 * 3600 * 1000).getTime();

// ✅ Helper function to add Authorization header automatically
function getAuthHeaders(customHeaders = {}) {
    const token = localStorage.getItem('auth_token');
    const headers = {
        'Content-Type': 'application/json',
        ...customHeaders
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

function genKey(plan = 'PREMIUM') {
    function randBlock(len) {
        const bytes = crypto.getRandomValues(new Uint8Array(len));
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let out = "";
        for (let i = 0; i < len; i++) {
            out += alphabet[bytes[i] % alphabet.length];
        }
        return out;
    }
    if (plan === 'PREMIUM') {
        const part1 = randBlock(4);
        const part2 = randBlock(4);
        return `SNTL-${part1}-${part2}`.toUpperCase();
    } else {
        const bytes = crypto.getRandomValues(new Uint8Array(10)).reduce(
            (s, b) => s + ('0' + b.toString(16)).slice(-2), ''
        );
        return `${plan}-${bytes.slice(0, 4)}-${bytes.slice(4, 8)}-${bytes.slice(8, 12)}-${bytes.slice(12, 16)}`.toUpperCase();
    }
}

// ========= setLoggedInUI — async để dùng await =========
async function setLoggedInUI(user) {
    const userEmail = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');
    const needLogin = document.getElementById('needLogin');
    const licenseArea = document.getElementById('licenseArea');
    const contactSection = document.getElementById('contact');

    if (userEmail) userEmail.textContent = `Đang đăng nhập: ${user.email}`;
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    if (needLogin) needLogin.classList.add('hidden');
    if (licenseArea) licenseArea.classList.remove('hidden');

    // ✅ Nếu là ADMIN → Chỉ hiện bảng giá
    if (user.role === 'admin') {
        // Ẩn tất cả sections
        document.querySelectorAll('section').forEach(section => {
            if (section.id !== 'pricing') {
                section.style.display = 'none';
            }
        });

        // Ẩn hero section (vì nó là div, không phải section)
        const heroSection = document.querySelector('section#home');
        if (heroSection) heroSection.style.display = 'none';

        // Ẩn nav menu
        var navEl = document.querySelector('nav');
        if (navEl) navEl.style.display = 'none';

        // Ẩn tất cả buttons action (Mua, Dùng miễn phí, Liên hệ báo giá)
        document.querySelectorAll('.require-login, a[href="#contact"]').forEach(btn => {
            btn.style.display = 'none';
        });

        // Ẩn form liên hệ
        if (contactSection) contactSection.style.display = 'none';

        return; // Không cần kiểm tra license khi là admin
    }

    // ===== LOGIC CHO CLIENT =====

    // Ẩn link "Hỗ trợ" trong nav
    document.querySelectorAll('a[href="#support"]').forEach(el => el.style.display = 'none');
    if (contactSection) contactSection.style.display = 'none';
    // Redirect button PRO → client.html tab 4
    document.querySelectorAll('a[href="#contact"], a[data-plan="PRO"]').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            window.location.href = 'client.html?tab=4&subject=Liên hệ báo giá gói PRO';
        });
    });

    // ✅ Kiểm tra license → đổi button PREMIUM thành "Gia hạn"
    try {
        const licenseRes = await fetch(`${API_BASE}/api/payment/license/active`, {
            credentials: 'include'
        });
        const licenseData = await licenseRes.json();

        const premiumBtn = document.querySelector('a[data-plan="PREMIUM"]');
        if (premiumBtn && licenseData.success) {
            premiumBtn.textContent = 'Gia hạn PREMIUM';
        }
    } catch (err) {
        console.warn('Không thể kiểm tra license:', err.message);
    } startIdleTimeout();
}

function setLoggedOutUI() {
    const userEmail = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');
    const needLogin = document.getElementById('needLogin');
    const licenseArea = document.getElementById('licenseArea');

    if (userEmail) userEmail.textContent = '';
    if (logoutBtn) logoutBtn.classList.add('hidden');
    if (needLogin) needLogin.classList.remove('hidden');
    if (licenseArea) licenseArea.classList.add('hidden');
}

// ========= Pricing -> preselect plan =========
$$('a[href="#checkout"][data-plan]').forEach(a => {
    a.addEventListener('click', () => {
        const plan = a.getAttribute('data-plan');
        setTimeout(() => { $('#planSelect').value = plan; }, 0);
    });
});

// ========= Query param sync ?plan=PREMIUM|PRO -> select =========
(function syncPlanFromQuery() {
    const m = location.href.match(/[?&]plan=(PREMIUM|PRO)/i);
    if (m) $('#planSelect').value = m[1].toUpperCase();
})();

// ========= Global variable: Lưu plan khi bấm button =========
let pendingRedirectPlan = null;

// ========= Sync click pricing -> select plan checkout =========
$$('a[data-plan]').forEach(a => {
    a.addEventListener('click', () => {
        const p = a.getAttribute('data-plan');
        setTimeout(() => {
            const sel = $('#planSelect');
            if (sel) sel.value = p;
        }, 0);
    });
});

// ========= Require login buttons =========
document.querySelectorAll('.require-login').forEach(btn => {
    btn.addEventListener('click', async e => {
        e.preventDefault();

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(`${API_BASE}/api/auth/session`, {
                credentials: "include",
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!res.ok) {
                // ❌ Chưa đăng nhập → Hiện modal + lưu plan
                pendingRedirectPlan = btn.getAttribute("data-plan");
                const authModal = document.getElementById('authModal');
                authModal.classList.remove('hidden');
                authModal.classList.add('flex');
                return;
            }

            // ✅ Đã đăng nhập → Redirect tới page tương ứng
            const user = await res.json();
            const plan = btn.getAttribute("data-plan");

            if (plan === "PREMIUM") {
                window.location.href = "payment.html?plan=PREMIUM";
            } else {
                window.location.href = "client.html";
            }
        } catch (err) {
            console.error("require-login check failed:", err.message);
            pendingRedirectPlan = btn.getAttribute("data-plan");
            const authModal = document.getElementById('authModal');
            authModal.classList.remove('hidden');
            authModal.classList.add('flex');
        }
    });
});

// ========= Smooth scroll anchors =========
const HEADER_HEIGHT = 64;

document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
        const targetId = link.getAttribute('href');
        if (!targetId || targetId === '#') return;

        const targetEl = document.querySelector(targetId);
        if (!targetEl) return;

        e.preventDefault();

        const targetPosition =
            targetEl.getBoundingClientRect().top +
            window.pageYOffset -
            HEADER_HEIGHT;

        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        history.pushState(null, '', targetId);
    });
});

// ========= Session check / Auth modal =========
document.addEventListener('DOMContentLoaded', () => {
    const authModal = document.getElementById('authModal');
    const openAuth = document.getElementById('openAuth');
    const openAuth_m = document.getElementById('openAuth_m');

    const handleAuthClick = async () => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(`${API_BASE}/api/auth/session`, {
                credentials: "include",
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!res.ok) {
                authModal.classList.remove('hidden');
                authModal.classList.add('flex');
                return;
            }

            const user = await res.json();

            if (user.role === "admin") {
                window.location.href = "admin.html";
            } else if (user.role === "supervisor") {
                window.location.href = "supervisor.html";
            } else {
                window.location.href = "client.html";
            }
        } catch (err) {
            console.error("Auth check failed:", err.message);
            authModal.classList.remove('hidden');
            authModal.classList.add('flex');
        }
    };

    openAuth?.addEventListener('click', handleAuthClick);
    openAuth_m?.addEventListener('click', handleAuthClick);

    document.getElementById('closeAuth')?.addEventListener('click', () => {
        authModal.classList.add('hidden');
        authModal.classList.remove('flex');
    });

    authModal?.addEventListener('click', e => {
        if (e.target === authModal) {
            authModal.classList.add('hidden');
            authModal.classList.remove('flex');
        }
    });
});

// ========= Auth Form - NEW: Phone & Email Login =========
let loginMode = 'phone'; // 'phone' or 'email'

const phoneLoginTab = document.getElementById('phoneLoginTab');
const emailLoginTab = document.getElementById('emailLoginTab');
const title = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const msg = document.getElementById('msg');
const form = document.getElementById('authForm');

// Initialize
switchLoginMode('phone');

phoneLoginTab.onclick = () => switchLoginMode('phone');
emailLoginTab.onclick = () => switchLoginMode('email');

function switchLoginMode(mode) {
    loginMode = mode;
    phoneLoginTab.classList.remove('active');
    emailLoginTab.classList.remove('active');
    
    const phoneFields = document.getElementById('phoneFields');
    const emailFields = document.getElementById('emailFields');
    
    if (mode === 'phone') {
        phoneLoginTab.classList.add('active');
        phoneFields.style.display = 'block';
        emailFields.style.display = 'none';
        title.textContent = 'Đăng nhập qua số điện thoại';
    } else {
        emailLoginTab.classList.add('active');
        phoneFields.style.display = 'none';
        emailFields.style.display = 'block';
        title.textContent = 'Đăng nhập qua email';
    }
    msg.textContent = '';
}

form.onsubmit = async e => {
    e.preventDefault();
    msg.textContent = '';

    const password = form.querySelector('input[name="password"]').value;

    if (loginMode === 'phone') {
        // ===== PHONE LOGIN =====
        const phone = form.querySelector('input[name="phone"]').value.trim().replace(/\D/g, '');
        const phoneError = document.getElementById('phoneError');

        if (!/^\d{10}$/.test(phone)) {
            phoneError.classList.remove('hidden');
            return;
        }
        phoneError.classList.add('hidden');

        if (!password) {
            msg.textContent = '⚠️ Vui lòng nhập mật khẩu.';
            return;
        }

        try {
            msg.textContent = '⏳ Đang đăng nhập...';
            console.log('[LOGIN PHONE] Logging in with phone:', phone);

            const res = await fetch(`${API_BASE}/api/auth/login/phone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: "include",
                body: JSON.stringify({ phone, password })
            });

            const data = await res.json().catch((err) => {
                console.error('[LOGIN PHONE] JSON parse error:', err);
                return {};
            });

            if (!res.ok) {
                console.error('[LOGIN PHONE] Login failed:', data);
                msg.textContent = data.message || 'Đăng nhập thất bại.';
                msg.style.color = '#f87171';
                return;
            }

            console.log('[LOGIN PHONE] Login successful');

            // ✅ Save token
            if (data.token) {
                localStorage.setItem('auth_token', data.token);
                console.log('[LOGIN PHONE] ✅ Token saved');
            }

            if (data.user && data.user.status === 'tạm ngưng') {
                msg.textContent = '❌ Tài khoản của bạn đã bị tạm ngưng';
                msg.style.color = '#f87171';
                return;
            }

            await setLoggedInUI(data.user);
            setupAccountButtons(data.user);

            const authModal = document.getElementById('authModal');
            authModal.classList.add('hidden');
            authModal.classList.remove('flex');

            // Redirect
            if (data.user.role === 'admin') {
                window.location.href = 'admin.html';
            } else if (data.user.role === 'supervisor') {
                window.location.href = 'supervisor.html';
            } else if (data.user.role === 'teamLeader') {
                window.location.href = 'team.html';
            } else {
                window.location.href = 'client.html';
            }
        } catch (err) {
            console.error('[LOGIN PHONE] Fetch error:', err);
            msg.textContent = '❌ Lỗi kết nối.';
            msg.style.color = '#f87171';
        }

    } else {
        // ===== EMAIL LOGIN =====
        const email = form.querySelector('input[name="email"]').value.trim().toLowerCase();

        if (!email || !password) {
            msg.textContent = '⚠️ Vui lòng nhập email và mật khẩu.';
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            msg.textContent = '⚠️ Email không hợp lệ.';
            return;
        }

        try {
            msg.textContent = '⏳ Đang đăng nhập...';
            console.log('[LOGIN EMAIL] Logging in with email:', email);

            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: "include",
                body: JSON.stringify({ email, password })
            });

            const data = await res.json().catch((err) => {
                console.error('[LOGIN EMAIL] JSON parse error:', err);
                return {};
            });

            if (!res.ok) {
                console.error('[LOGIN EMAIL] Login failed:', data);
                msg.textContent = data.message || 'Đăng nhập thất bại.';
                msg.style.color = '#f87171';
                return;
            }

            console.log('[LOGIN EMAIL] Login successful');

            // ✅ Save token
            if (data.token) {
                localStorage.setItem('auth_token', data.token);
                console.log('[LOGIN EMAIL] ✅ Token saved');
            }

            if (data.user && data.user.status === 'tạm ngưng') {
                msg.textContent = '❌ Tài khoản của bạn đã bị tạm ngưng';
                msg.style.color = '#f87171';
                return;
            }

            await setLoggedInUI(data.user);
            setupAccountButtons(data.user);

            const authModal = document.getElementById('authModal');
            authModal.classList.add('hidden');
            authModal.classList.remove('flex');

            // Redirect
            if (data.user.role === 'admin') {
                window.location.href = 'admin.html';
            } else if (data.user.role === 'supervisor') {
                window.location.href = 'supervisor.html';
            } else if (data.user.role === 'teamLeader') {
                window.location.href = 'team.html';
            } else {
                window.location.href = 'client.html';
            }
        } catch (err) {
            console.error('[LOGIN EMAIL] Fetch error:', err);
            msg.textContent = '❌ Lỗi kết nối.';
            msg.style.color = '#f87171';
        }
    }
};

// ========= Header logout / account buttons =========
function setupAccountButtons(user) {
    const openAuthBtn = document.getElementById("openAuth");
    const openAuthBtn_m = document.getElementById("openAuth_m");
    const logoutBtn = document.getElementById("logoutBtnHeader");
    const logoutBtn_m = document.getElementById("logoutBtnHeader_m");

    if (openAuthBtn) openAuthBtn.textContent = "Tài khoản";
    if (openAuthBtn_m) openAuthBtn_m.textContent = "Tài khoản";

    const goAccount = () => {
        if (user.role === "admin") {
            window.location.href = "admin.html";
        } else if (user.role === "supervisor") {
            window.location.href = "supervisor.html";
        } else if (user.role === "teamLeader") {
            window.location.href = "team.html";
        } else {
            window.location.href = "client.html";
        }
    };

    openAuthBtn?.addEventListener("click", goAccount);
    openAuthBtn_m?.addEventListener("click", goAccount);

    const doLogout = async () => {
        // Token will be auto-added via fetch monkey-patch
        await fetch(`${API_BASE}/api/auth/logout`, {
            method: "POST"
        });
        localStorage.removeItem('auth_token');
        window.location.reload();
    };

    logoutBtn?.classList.remove("hidden");
    logoutBtn_m?.classList.remove("hidden");
    logoutBtn?.addEventListener("click", doLogout);
    logoutBtn_m?.addEventListener("click", doLogout);
}
function validatePhone(input) {
    input.value = input.value.replace(/\D/g, '').slice(0, 10); // chỉ cho nhập số, tối đa 10
    const err = document.getElementById('phoneError');
    if (input.value.length > 0 && input.value.length < 10) {
        err.classList.remove('hidden');
    } else {
        err.classList.add('hidden');
    }
}
// ========= Trial Contact Form =========
const trialContactForm = document.getElementById('trialContactForm');
if (trialContactForm) {
    trialContactForm.addEventListener('submit', async e => {
        e.preventDefault();
        const msgEl = document.getElementById('trialContactMsg');
        msgEl.textContent = '';

        const name = trialContactForm.querySelector('[name="name"]').value.trim();
        const email = trialContactForm.querySelector('[name="email"]').value.trim();
        const message = trialContactForm.querySelector('[name="message"]').value.trim();

        if (!name || !email || !message) {
            msgEl.style.color = '#f87171';
            msgEl.textContent = '⚠️ Vui lòng điền đầy đủ thông tin.';
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            msgEl.style.color = '#f87171';
            msgEl.textContent = '⚠️ Email không hợp lệ.';
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/trial-contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                msgEl.style.color = '#f87171';
                msgEl.textContent = data.message || '❌ Gửi thất bại.';
                return;
            }

            msgEl.style.color = '#4ade80';
            msgEl.textContent = '✅ Yêu cầu đã được gửi thành công!';
            trialContactForm.reset();
        } catch (err) {
            msgEl.style.color = '#f87171';
            msgEl.textContent = '❌ Có lỗi xảy ra. Vui lòng thử lại.';
        }
    });
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

// Chỉ bắt đầu idle timeout khi đã đăng nhập
function startIdleTimeout() {
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetIdleTimer, { passive: true });
    });
    resetIdleTimer();
}