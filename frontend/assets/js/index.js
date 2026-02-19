

document.getElementById('year').textContent = new Date().getFullYear();
// ========= LocalStorage model =========

const API_BASE = 'https://sentinelvn.onrender.com';
const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => Array.from(root.querySelectorAll(q));
const LS_SESSION = 'sentinel_session';

const state = {
    get session() { return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); },
    set session(v) { localStorage.setItem(LS_SESSION, JSON.stringify(v)); },
    clearSession() { localStorage.removeItem(LS_SESSION); },
};

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



function updateAuthUI() {
    const sess = state.session;
    const loggedIn = !!(sess && sess.email);
    const email = loggedIn ? sess.email : '';

    const userEmail = $('#userEmail');
    const logoutBtn = $('#logoutBtn');
    const needLogin = $('#needLogin');
    const licenseArea = $('#licenseArea');
    const authBtnText = $('#authBtnText');
    const authBtnText_m = $('#authBtnText_m');

    if (userEmail) userEmail.textContent = loggedIn ? `Đang đăng nhập: ${email}` : '';
    if (logoutBtn) logoutBtn.classList.toggle('hidden', !loggedIn);
    if (needLogin) needLogin.classList.toggle('hidden', loggedIn);
    if (licenseArea) licenseArea.classList.toggle('hidden', !loggedIn);

    if (authBtnText) authBtnText.textContent = loggedIn ? 'Tài khoản' : 'Đăng nhập';
    if (authBtnText_m && authBtnText) authBtnText_m.textContent = authBtnText.textContent;

    if (loggedIn && typeof renderLicenses === "function") {
        renderLicenses();
    }
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
    btn.addEventListener('click', e => {
        e.preventDefault();

        const session = JSON.parse(localStorage.getItem("sentinel_session"));

        // Nếu chưa login → mở modal
        if (!session || !session.email) {
            const authModal = document.getElementById('authModal');
            authModal.classList.remove('hidden');
            authModal.classList.add('flex');
            return;
        }

        // Nếu đã login
        const plan = btn.getAttribute("data-plan");

        if (plan === "PREMIUM") {
            window.location.href = "payment.html?plan=PREMIUM";
        } else {
            // FREE
            window.location.href = "client.html";
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



document.addEventListener('DOMContentLoaded', () => {
    const authModal = document.getElementById('authModal');

    document.getElementById('openAuth')?.addEventListener('click', () => {

        const session = JSON.parse(localStorage.getItem("sentinel_session"));

        if (session) {
            if (session.role === "client") {
                window.location.href = "client.html";
            } else {
                window.location.href = "admin.html";
            }
            return;
        }

        authModal.classList.remove('hidden');
        authModal.classList.add('flex');
    });
    document.getElementById('openAuth_m')?.addEventListener('click', () => {

        const session = JSON.parse(localStorage.getItem("sentinel_session"));

        if (session) {
            if (session.role === "client") {
                window.location.href = "client.html";
            } else {
                window.location.href = "admin.html";
            }
            return;
        }
        authModal.classList.remove('hidden');
        authModal.classList.add('flex');
    });
    document.getElementById('closeAuth')?.addEventListener('click', () => {
        authModal.classList.add('hidden');
        authModal.classList.remove('flex');
    });
    authModal.addEventListener('click', e => {
        if (e.target === authModal) {
            authModal.classList.add('hidden');
            authModal.classList.remove('flex');
        }
    });
});


/* ===== CONST ===== */
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'Thisisadmin';

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
        // Không cho tạo admin
        if (email === ADMIN_EMAIL.toLowerCase()) {
            msg.textContent = '❌ Không thể đăng ký tài khoản admin.';
            return;
        }
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
            body: JSON.stringify({ email, password, name: nameInput })
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
    // ADMIN
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        localStorage.setItem(LS_SESSION, JSON.stringify({
            email,
            role: 'admin',
            token: 'admin-token'
        }));
        window.location.href = 'admin.html';
        return;
    }

    // CLIENT: gọi API login
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    localStorage.setItem(LS_SESSION, JSON.stringify({
        email: data.user.email,
        role: data.user.role,
        token: data.token
    }));
    window.location.href = data.user.role === 'admin' ? 'admin.html' : 'client.html';
};

document.addEventListener("DOMContentLoaded", () => {

    const session = JSON.parse(localStorage.getItem("sentinel_session"));

    const btn = document.getElementById("openAuth");
    const btn_m = document.getElementById("openAuth_m");

    if (!btn || !btn_m) return;

    // Nếu đã đăng nhập
    if (session && session.email) {

        btn.textContent = "Tài khoản";
        btn_m.textContent = "Tài khoản";

        btn.onclick = () => {
            if (session.role === "client") {
                window.location.href = "client.html";
            } else if (session.role === "admin") {
                window.location.href = "admin.html";
            }
        };
        btn_m.onclick = btn.onclick;
    }
});
// ===== HEADER LOGOUT HANDLER =====
document.addEventListener("DOMContentLoaded", () => {
    const session = JSON.parse(localStorage.getItem(LS_SESSION));

    const logoutBtn = document.getElementById("logoutBtnHeader");
    const logoutBtn_m = document.getElementById("logoutBtnHeader_m");
    const openAuthBtn = document.getElementById("openAuth");
    const openAuthBtn_m = document.getElementById("openAuth_m");

    if (session && session.role === "client") {

        // Hiện nút logout
        logoutBtn?.classList.remove("hidden");
        logoutBtn_m?.classList.remove("hidden");

        // Đổi text thành Tài khoản
        if (openAuthBtn) openAuthBtn.textContent = "Tài khoản";
        if (openAuthBtn_m) openAuthBtn_m.textContent = "Tài khoản";

        // Xử lý logout
        const doLogout = () => {
            localStorage.removeItem(LS_SESSION);
            window.location.reload();
        };
        logoutBtn?.addEventListener("click", doLogout);
        logoutBtn_m?.addEventListener("click", doLogout);
    }
});
