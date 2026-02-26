

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
        setLoggedInUI(user);
        setupAccountButtons(user);
    } catch (err) {
        console.warn("Session check failed on page load:", err.message);
        setLoggedOutUI();
    }
});
// ========= LocalStorage model =========

const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => Array.from(root.querySelectorAll(q));
const fmtDate = ts => new Date(ts).toLocaleDateString('vi-VN');
const addDays = (ts, days) => new Date(ts + days * 24 * 3600 * 1000).getTime();

// ---- License Key Generator ----
// PREMIUM (dev, 75k/tháng): SNTL-9X2B-G7QM
// PRO (doanh nghiệp): PRO-XXXX-XXXX-XXXX-XXXX
function genKey(plan = 'PREMIUM') {
    // helper tạo block A-Z0-9
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


// Kiểm tra session khi load trang
function setLoggedInUI(user) {
    const userEmail = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');
    const needLogin = document.getElementById('needLogin');
    const licenseArea = document.getElementById('licenseArea');

    if (userEmail) userEmail.textContent = `Đang đăng nhập: ${user.email}`;
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    if (needLogin) needLogin.classList.add('hidden');
    if (licenseArea) licenseArea.classList.remove('hidden');
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
        const plan = a.getAttribute('data-plan'); // PREMIUM / PRO
        setTimeout(() => { $('#planSelect').value = plan; }, 0);
    });
});

// ========= Query param sync ?plan=PREMIUM|PRO -> select =========
(function syncPlanFromQuery() {
    const m = location.href.match(/[?&]plan=(PREMIUM|PRO)/i);
    if (m) $('#planSelect').value = m[1].toUpperCase();
})();

// ========= Sync click pricing -> select plan checkout =========
$$('a[data-plan]').forEach(a => {
    a.addEventListener('click', () => {
        const p = a.getAttribute('data-plan'); // PREMIUM | PRO
        setTimeout(() => {
            const sel = $('#planSelect');
            if (sel) sel.value = p;
        }, 0);
    });
});


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
                const authModal = document.getElementById('authModal');
                authModal.classList.remove('hidden');
                authModal.classList.add('flex');
                return;
            }

            const user = await res.json();
            const plan = btn.getAttribute("data-plan");

            if (plan === "PREMIUM") {
                window.location.href = "payment.html?plan=PREMIUM";
            } else {
                window.location.href = "client.html";
            }
        } catch (err) {
            console.error("require-login check failed:", err.message);
            const authModal = document.getElementById('authModal');
            authModal.classList.remove('hidden');
            authModal.classList.add('flex');
        }
    });
});



// ========= Smooth scroll anchors (FIXED HEADER) =========
const HEADER_HEIGHT = 64; // chiều cao header (h-16)

document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
        const targetId = link.getAttribute('href');
        const targetEl = document.querySelector(targetId);

        if (!targetEl) return;

        e.preventDefault();

        const targetPosition =
            targetEl.getBoundingClientRect().top +
            window.pageYOffset -
            HEADER_HEIGHT;

        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });

        history.pushState(null, '', targetId);
    });
});


// ========= Session check with retry logic  =========
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



/* ===== CONST ===== */
/*const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'Thisisadmin';*/

let mode = 'login';


/* ELEMENTS */
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const forgotLink = document.getElementById('forgotLink');
const title = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const msg = document.getElementById('msg');
const form = document.getElementById('authForm');
switchMode('login');


/* MODE SWITCH */
loginTab.onclick = () => switchMode('login');
signupTab.onclick = () => switchMode('signup');
forgotLink.onclick = () => location.href = 'forgot.html';

function switchMode(m) {
    mode = m;
    // Xóa active trước
    loginTab.classList.remove('active');
    signupTab.classList.remove('active');
    // Thêm active cho tab đúng
    if (m === 'login') {
        loginTab.classList.add('active');
    } else {
        signupTab.classList.add('active');
    }
    title.textContent = m === 'login'
        ? 'Đăng nhập hệ thống'
        : 'Đăng ký tài khoản';
    submitBtn.textContent = m === 'login'
        ? 'Đăng nhập'
        : 'Đăng ký';
    msg.textContent = '';
    const nameField = form.querySelector('input[name="name"]');
    if (nameField) {
        nameField.style.display = m === 'signup' ? 'block' : 'none';
    }

}


/* SUBMIT */

form.onsubmit = async e => {
    e.preventDefault();
    msg.textContent = '';
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const nameInput = form.name ? form.name.value.trim() : "";


    /* ===== SIGNUP ===== */
    if (mode === 'signup') {
        if (!email || !password) {
            msg.textContent = '⚠️ Vui lòng nhập đầy đủ thông tin.';
            return;
        }
        if (password.length < 6) {
            msg.textContent = '⚠️ Mật khẩu phải tối thiểu 6 ký tự.';
            return;
        }
        // Gọi API đăng ký
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

    /* ===== LOGIN ===== */
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include", // rất quan trọng
        body: JSON.stringify({ email, password })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        msg.textContent = data.message || 'Đăng nhập thất bại.';
        return;
    }

    if (data.user && data.user.status === 'tạm ngưng') {
        msg.textContent = '❌ Tài khoản của bạn hiện đã bị tạm ngưng';
        return;
    }

    // Sau khi login thành công
    setLoggedInUI(data.user);
    setupAccountButtons(data.user);
    // Ẩn modal nếu đang mở
    const authModal = document.getElementById('authModal');
    authModal.classList.add('hidden');
    authModal.classList.remove('flex');
    document.getElementById('authModal')?.classList.add('hidden');


};


// ===== HEADER LOGOUT HANDLER =====

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