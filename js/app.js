document.getElementById('year').textContent = new Date().getFullYear();

// ========= LocalStorage model =========
const LS_USERS = 'sentinel_users';      // { email: {password} }
const LS_SESSION = 'sentinel_session';  // { email }
const LS_LICENSES = 'sentinel_licenses';// { email: [ {key, plan, status, createdAt, expiresAt} ] }

const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => Array.from(root.querySelectorAll(q));

const state = {
    get users() { return JSON.parse(localStorage.getItem(LS_USERS) || '{}'); },
    set users(v) { localStorage.setItem(LS_USERS, JSON.stringify(v)); },
    get session() { return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); },
    set session(v) { localStorage.setItem(LS_SESSION, JSON.stringify(v)); },
    clearSession() { localStorage.removeItem(LS_SESSION); },
    get licenses() { return JSON.parse(localStorage.getItem(LS_LICENSES) || '{}'); },
    set licenses(v) { localStorage.setItem(LS_LICENSES, JSON.stringify(v)); },
};

const fmtDate = ts => new Date(ts).toLocaleDateString('vi-VN');
const addDays = (ts, days) => new Date(ts + days * 24 * 3600 * 1000).getTime();

// License Key Generator moved to checkout.js

// ========= Auth modal =========
const authModal = $('#authModal');
const openAuthBtns = ['#openAuth', '#openAuth_m', '#needLoginLink'].map(sel => $(sel));
openAuthBtns.forEach(btn => btn && btn.addEventListener('click', e => {
    e.preventDefault();
    authModal.classList.remove('hidden');
    authModal.classList.add('flex');
    // Default to Login tab
    signupForm.classList.add('hidden-el');
    loginForm.classList.remove('hidden-el');
    updateTabStyle(true);
}));



$('#closeAuth').addEventListener('click', () => authModal.classList.add('hidden'));

const loginForm = $('#loginForm');
const signupForm = $('#signupForm');
const tabLogin = $('#tabLogin');
const tabSignup = $('#tabSignup');

const updateTabStyle = (isLogin) => {
    if (isLogin) {
        tabLogin.classList.add('bg-brand-400', 'text-black', 'font-bold');
        tabLogin.classList.remove('text-white', 'border-white/20'); // Remove default btn styles if needed, or just add override
        tabSignup.classList.remove('bg-brand-400', 'text-black', 'font-bold');
    } else {
        tabSignup.classList.add('bg-brand-400', 'text-black', 'font-bold');
        tabSignup.classList.remove('text-white', 'border-white/20');
        tabLogin.classList.remove('bg-brand-400', 'text-black', 'font-bold');
    }
};

tabLogin.addEventListener('click', () => {
    signupForm.classList.add('hidden-el');
    loginForm.classList.remove('hidden-el');
    updateTabStyle(true);
});
tabSignup.addEventListener('click', () => {
    loginForm.classList.add('hidden-el');
    signupForm.classList.remove('hidden-el');
    updateTabStyle(false);
});

// Init default style
updateTabStyle(true);

signupForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = signupForm.email.value.trim().toLowerCase();
    const password = signupForm.password.value;
    const users = state.users;
    if (users[email]) {
        $('#signupMsg').textContent = 'Email đã tồn tại.';
        return;
    }
    users[email] = { password };
    state.users = users;
    state.session = { email };
    $('#signupMsg').textContent = 'Tạo tài khoản thành công.';
    updateAuthUI();
    authModal.classList.add('hidden');
});

loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = loginForm.email.value.trim().toLowerCase();
    const password = loginForm.password.value;
    const users = state.users;
    if (!users[email] || users[email].password !== password) {
        $('#loginMsg').textContent = 'Sai thông tin đăng nhập.';
        return;
    }
    state.session = { email };
    $('#loginMsg').textContent = 'Đăng nhập thành công.';
    updateAuthUI();
    authModal.classList.add('hidden');
});

$('#logoutBtn').addEventListener('click', () => {
    state.clearSession();
    updateAuthUI();
});

function updateAuthUI() {
    const sess = state.session;
    const loggedIn = !!(sess && sess.email);
    const email = loggedIn ? sess.email : '';

    $('#userEmail').textContent = loggedIn ? `Đang đăng nhập: ${email}` : '';
    $('#logoutBtn').classList.toggle('hidden', !loggedIn);
    $('#needLogin').classList.toggle('hidden', loggedIn);
    $('#licenseArea').classList.toggle('hidden', !loggedIn);

    $('#authBtnText').textContent = loggedIn ? 'Tài khoản' : 'Đăng nhập / Đăng ký';
    $('#authBtnText_m').textContent = $('#authBtnText').textContent;

    if (loggedIn) renderLicenses();
}
updateAuthUI();

// ========= Smooth scroll anchors =========
$$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length > 1 && document.querySelector(id)) {
            e.preventDefault();
            document.querySelector(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', id);
        }
    });
});

