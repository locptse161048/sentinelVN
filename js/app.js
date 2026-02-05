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

// ========= Auth modal =========
const authModal = $('#authModal');
const openAuthBtns = ['#openAuth', '#openAuth_m', '#needLoginLink'].map(sel => $(sel));
openAuthBtns.forEach(btn => btn && btn.addEventListener('click', e => {
    e.preventDefault();
    authModal.classList.remove('hidden');
    authModal.classList.add('flex');
}));

$('#closeAuth').addEventListener('click', () => authModal.classList.add('hidden'));

const loginForm = $('#loginForm');
const signupForm = $('#signupForm');
const tabLogin = $('#tabLogin');
const tabSignup = $('#tabSignup');

tabLogin.addEventListener('click', () => {
    signupForm.classList.add('hidden-el');
    loginForm.classList.remove('hidden-el');
});
tabSignup.addEventListener('click', () => {
    loginForm.classList.add('hidden-el');
    signupForm.classList.remove('hidden-el');
});

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

    $('#authBtnText').textContent = loggedIn ? 'Tài khoản' : 'Đăng nhập';
    $('#authBtnText_m').textContent = $('#authBtnText').textContent;

    if (loggedIn) renderLicenses();
}
updateAuthUI();

// ========= Pricing -> preselect plan =========
$$('a[href="#checkout"][data-plan]').forEach(a => {
    a.addEventListener('click', () => {
        const plan = a.getAttribute('data-plan'); // PREMIUM / PRO
        setTimeout(() => { $('#planSelect').value = plan; }, 0);
    });
});

// ========= Checkout submit =========
$('#checkoutForm').addEventListener('submit', e => {
    e.preventDefault();

    const sess = state.session;
    if (!sess) {
        $('#checkoutMsg').textContent = 'Vui lòng đăng nhập trước khi thanh toán.';
        authModal.classList.remove('hidden');
        authModal.classList.add('flex');
        return;
    }

    const email = sess.email;
    const form = new FormData(e.target);
    const plan = form.get('plan'); // PREMIUM hoặc PRO

    const now = Date.now();
    const exp = addDays(now, 30);
    const key = genKey(plan);

    const licenses = state.licenses;
    licenses[email] = licenses[email] || [];
    licenses[email].push({
        key,
        plan,
        status: 'active',
        createdAt: now,
        expiresAt: exp
    });
    state.licenses = licenses;

    $('#checkoutMsg').innerHTML =
        `✅ Thanh toán thành công (demo). License của bạn: <span class="link">${key}</span>. Đã thêm vào Dashboard.`;

    renderLicenses();
    location.hash = '#dashboard';
});

// ========= License Dashboard render =========
function renderLicenses() {
    const sess = state.session;
    if (!sess) return;
    const email = sess.email;

    const list = (state.licenses[email] || []).sort((a, b) => b.createdAt - a.createdAt);
    const tbody = $('#licenseTbody');
    tbody.innerHTML = '';

    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-4 text-white/60">Chưa có license.</td></tr>`;
        return;
    }

    list.forEach((lic, idx) => {
        const tr = document.createElement('tr');
        const statusColor = lic.status === 'active' ? 'text-emerald-400' : 'text-white/60';
        tr.innerHTML = `
      <td class="px-4 py-3 font-mono">${lic.key}</td>
      <td class="px-4 py-3">${lic.plan}</td>
      <td class="px-4 py-3 ${statusColor}">${lic.status}</td>
      <td class="px-4 py-3">${fmtDate(lic.createdAt)}</td>
      <td class="px-4 py-3">${fmtDate(lic.expiresAt)}</td>
      <td class="px-4 py-3">
        <div class="flex flex-wrap gap-2">
          <button class="px-3 py-1 rounded border border-white/20 hover:border-brand-400/60 text-xs" data-act="extend" data-key="${lic.key}">Gia hạn +30d</button>
          <button class="px-3 py-1 rounded border border-white/20 hover:border-brand-400/60 text-xs" data-act="toggle" data-key="${lic.key}">${lic.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}</button>
          <button class="px-3 py-1 rounded border border-white/20 hover:border-brand-400/60 text-xs" data-act="copy" data-key="${lic.key}">Copy Key</button>
        </div>
      </td>
    `;
        tbody.appendChild(tr);
    });

    // nút hành động
    tbody.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            const act = btn.getAttribute('data-act');
            const key = btn.getAttribute('data-key');
            const email = state.session.email;
            const all = state.licenses;
            const arr = all[email] || [];
            const lic = arr.find(l => l.key === key);

            if (act === 'copy') {
                if (key) {
                    navigator.clipboard.writeText(key);
                    btn.textContent = 'Đã copy';
                    setTimeout(() => btn.textContent = 'Copy Key', 800);
                }
                return;
            }

            if (!lic) return;

            if (act === 'extend') {
                lic.expiresAt = addDays(lic.expiresAt, 30);
            }
            if (act === 'toggle') {
                lic.status = lic.status === 'active' ? 'paused' : 'active';
            }

            all[email] = arr;
            state.licenses = all;
            renderLicenses();
        });
    });
}

// ========= Manual Activation =========
$('#activateForm').addEventListener('submit', e => {
    e.preventDefault();

    const sess = state.session;
    if (!sess) {
        $('#activateMsg').textContent = 'Hãy đăng nhập trước.';
        return;
    }

    const rawKey = new FormData(e.target).get('key').trim().toUpperCase();
    if (!rawKey || rawKey.length < 10) {
        $('#activateMsg').textContent = 'Key không hợp lệ.';
        return;
    }

    // Suy đoán gói từ key:
    // - SNTL-... => PREMIUM
    // - PRO-...  => PRO
    // fallback   => PREMIUM
    let planGuess = 'PREMIUM';
    if (rawKey.startsWith('SNTL-')) {
        planGuess = 'PREMIUM';
    } else if (rawKey.startsWith('PRO-')) {
        planGuess = 'PRO';
    }

    const now = Date.now();
    const exp = addDays(now, 30);

    const licenses = state.licenses;
    const email = sess.email;
    licenses[email] = licenses[email] || [];

    // Chỉ cho phép kích hoạt/renew nếu key đã thuộc về user này
    let found = false;
    for (let lic of licenses[email]) {
        if (lic.key === rawKey) {
            // Update expiration and status
            lic.expiresAt = exp;
            lic.status = 'active';
            found = true;
            break;
        }
    }
    if (!found) {
        // Nếu key chưa từng thuộc về user này, báo lỗi
        $('#activateMsg').textContent = 'Key không thuộc tài khoản này hoặc không hợp lệ.';
        return;
    }
    state.licenses = licenses;

    $('#activateMsg').textContent = 'Đã gia hạn license.';
    renderLicenses();
    e.target.reset();
});

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
