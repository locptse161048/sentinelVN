document.getElementById('year').textContent = new Date().getFullYear();
const API_BASE = 'https://sentinelvn.onrender.com';

// ========= Auth session check on page load =========
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${API_BASE}/api/auth/session`, {
            credentials: "include",
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!res.ok) {
            setLoggedOutUI();
            return;
        }
        const user = await res.json();
        await setLoggedInUI(user);  // ← await vì hàm async
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
    }
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

// ========= Auth Form =========
let mode = 'login';

const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const forgotLink = document.getElementById('forgotLink');
const title = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const msg = document.getElementById('msg');
const form = document.getElementById('authForm');
switchMode('login');

loginTab.onclick = () => switchMode('login');
signupTab.onclick = () => switchMode('signup');
forgotLink.onclick = () => location.href = 'forgot.html';

function switchMode(m) {
    mode = m;
    loginTab.classList.remove('active');
    signupTab.classList.remove('active');
    if (m === 'login') {
        loginTab.classList.add('active');
    } else {
        signupTab.classList.add('active');
    }
    title.textContent = m === 'login' ? 'Đăng nhập hệ thống' : 'Đăng ký tài khoản';
    submitBtn.textContent = m === 'login' ? 'Đăng nhập' : 'Đăng ký';
    msg.textContent = '';
    const nameField = form.querySelector('input[name="name"]');
    if (nameField) nameField.style.display = m === 'signup' ? 'block' : 'none';
}

form.onsubmit = async e => {
    e.preventDefault();
    msg.textContent = '';
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const nameInput = form.name ? form.name.value.trim() : "";

    if (mode === 'signup') {
        if (!email || !password) { msg.textContent = '⚠️ Vui lòng nhập đầy đủ thông tin.'; return; }
        if (password.length < 6) { msg.textContent = '⚠️ Mật khẩu phải tối thiểu 6 ký tự.'; return; }

        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName: nameInput })
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            msg.textContent = data.message || 'Đăng ký thất bại.';
            return;
        }
        msg.textContent = '✅ Đăng ký thành công. Hãy đăng nhập.';
        switchMode('login');
        return;
    }

    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify({ email, password })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) { msg.textContent = data.message || 'Đăng nhập thất bại.'; return; }

    if (data.user && data.user.status === 'tạm ngưng') {
        msg.textContent = '❌ Tài khoản của bạn hiện đã bị tạm ngưng';
        return;
    }

    await setLoggedInUI(data.user);  // ← await
    setupAccountButtons(data.user);

    const authModal = document.getElementById('authModal');
    authModal.classList.add('hidden');
    authModal.classList.remove('flex');

    // ✅ Redirect based on role (không lưu localStorage)
    if (data.user.role === 'admin') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'client.html';
    }
    pendingRedirectPlan = null;
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
        } else {
            window.location.href = "client.html";
        }
    };

    openAuthBtn?.addEventListener("click", goAccount);
    openAuthBtn_m?.addEventListener("click", goAccount);

    const doLogout = async () => {
        await fetch(`${API_BASE}/api/auth/logout`, {
            method: "POST",
            credentials: "include"
        });
        window.location.reload();
    };

    logoutBtn?.classList.remove("hidden");
    logoutBtn_m?.classList.remove("hidden");
    logoutBtn?.addEventListener("click", doLogout);
    logoutBtn_m?.addEventListener("click", doLogout);
}