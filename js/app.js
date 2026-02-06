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

// ========= Auth modal =========
const authModal = $('#authModal');
const authTitle = $('#authTitle');

// ========= Event Delegation for Auth Buttons =========
document.addEventListener('click', (e) => {
    const target = e.target;

    // 1. Open Auth Modal
    if (target.closest('#openAuth') || target.closest('#openAuth_m') || target.closest('#needLoginLink')) {
        e.preventDefault();
        authModal.classList.remove('hidden');
        authModal.classList.add('flex');
        showLogin();
        return;
    }

    // 2. Logout (Desktop & Mobile)
    if (target.closest('#logoutBtn') || target.closest('#logoutBtn_m')) {
        e.preventDefault();
        state.clearSession();
        updateAuthUI();
        return;
    }

    // 3. Switch Forms
    if (target.closest('#toSignup')) {
        e.preventDefault();
        showSignup();
        return;
    }
    if (target.closest('#toLogin')) {
        e.preventDefault();
        showLogin();
        return;
    }

    // 4. Close Modal
    if (target.closest('#closeAuth')) {
        e.preventDefault();
        authModal.classList.add('hidden');
        return;
    }
});

const loginForm = $('#loginForm');
const signupForm = $('#signupForm');

function showLogin() {
    if (!loginForm || !signupForm) return;
    loginForm.classList.remove('hidden-el');
    signupForm.classList.add('hidden-el');
    if (authTitle) authTitle.textContent = 'Đăng nhập từ Sentinel VN';
    const msg = $('#loginMsg');
    if (msg) msg.textContent = '';
}

function showSignup() {
    if (!loginForm || !signupForm) return;
    loginForm.classList.add('hidden-el');
    signupForm.classList.remove('hidden-el');
    if (authTitle) authTitle.textContent = 'Đăng ký tài khoản mới';
    const msg = $('#signupMsg');
    if (msg) msg.textContent = '';
}

if (signupForm) {
    signupForm.addEventListener('submit', e => {
        e.preventDefault();
        const fullname = signupForm.fullname.value.trim();
        const email = signupForm.email.value.trim().toLowerCase();
        const password = signupForm.password.value;

        if (!fullname) {
            $('#signupMsg').textContent = 'Vui lòng nhập họ tên.';
            return;
        }

        const users = state.users;
        if (users[email]) {
            $('#signupMsg').textContent = 'Email đã tồn tại.';
            return;
        }

        users[email] = { password, fullname };
        state.users = users;

        // Auto switch to login and fill email
        showLogin();
        loginForm.email.value = email;
        const loginMsg = $('#loginMsg');
        if (loginMsg) {
            loginMsg.textContent = 'Đăng ký thành công! Hãy đăng nhập.';
            loginMsg.classList.remove('text-red-400');
            loginMsg.classList.add('text-green-400');
        }
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = loginForm.email.value.trim().toLowerCase();
        const password = loginForm.password.value;
        const users = state.users;

        if (!users[email] || users[email].password !== password) {
            const loginMsg = $('#loginMsg');
            if (loginMsg) {
                loginMsg.textContent = 'Sai email hoặc mật khẩu.';
                loginMsg.classList.add('text-red-400');
                loginMsg.classList.remove('text-green-400');
            }
            return;
        }

        state.session = { email };
        updateAuthUI();
        authModal.classList.add('hidden');
        loginForm.reset();
    });
}

function updateAuthUI() {
    const sess = state.session;
    const loggedIn = !!(sess && sess.email);
    const users = state.users;
    const currentUser = loggedIn ? users[sess.email] : null;
    const name = currentUser ? currentUser.fullname : 'User';

    // Update Header UI
    updateUserHeaderUI(loggedIn, name);

    // Other UI parts
    if ($('#needLogin')) $('#needLogin').classList.toggle('hidden', loggedIn);
    if ($('#licenseArea')) $('#licenseArea').classList.toggle('hidden', !loggedIn);
    if (loggedIn && typeof renderLicenses === 'function') renderLicenses();
}

function updateUserHeaderUI(loggedIn, name) {
    // Desktop HTML
    const html = loggedIn
        ? `
        <div class="relative group h-full flex items-center">
            <button class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-brand-400/50 hover:bg-white/5 text-sm">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1FE3FF&color=000&size=32" class="w-6 h-6 rounded-full">
                <span class="max-w-[100px] truncate">Xin chào, ${name}</span>
                <span class="text-xs">▼</span>
            </button>
            <!-- Dropdown Menu with invisible bridge ("pt-4" padding top) to catch hover -->
            <div class="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-50">
                <div class="bg-[#0F161C] border border-white/10 rounded-xl shadow-xl overflow-hidden">
                    <div class="py-1">
                        <button id="logoutBtn" class="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5">
                            🚪 Đăng xuất
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `
        : `
        <button id="openAuth" class="px-3 py-1.5 rounded-lg border border-white/20 hover:border-brand-400/60 text-sm">
            <span>Đăng nhập / Đăng ký</span>
        </button>
        `;

    // Mobile HTML (Note: Added md:hidden to prevent showing on desktop)
    const mobileHtml = loggedIn
        ? `
        <div id="mobileUserMenu" class="md:hidden flex items-center gap-2 px-3 py-1.5 rounded-lg border border-brand-400/50 text-sm">
             <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1FE3FF&color=000&size=32" class="w-6 h-6 rounded-full">
             <span class="max-w-[80px] truncate">${name}</span>
             <button id="logoutBtn_m" class="ml-2 text-red-400 text-xs border border-red-400/30 px-2 py-0.5 rounded">Exit</button>
        </div>
        `
        : `
        <button id="openAuth_m" class="md:hidden px-3 py-1.5 rounded-lg border border-white/20 hover:border-brand-400/60 text-sm">
            <span id="authBtnText_m">Đăng nhập / Đăng ký</span>
        </button>
        `;

    // 1. Update Desktop container
    const nav = $('nav.hidden.md\\:flex');
    if (nav) {
        const openAuthContainer = nav.querySelector('#openAuth') || nav.querySelector('.group');
        if (openAuthContainer) {
            openAuthContainer.outerHTML = html;
        }
    }

    // 2. Update Mobile container
    const mobileContainer = $('#openAuth_m') || $('#mobileUserMenu');
    if (mobileContainer) {
        mobileContainer.outerHTML = mobileHtml;
    }
}
updateAuthUI();

// ========= Smooth scroll anchors =========
$$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id && id.startsWith('#') && id.length > 1) {
            const el = document.querySelector(id);
            if (el) {
                e.preventDefault();
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.replaceState(null, '', id);
            }
        }
    });
});
