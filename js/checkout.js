// ========= Checkout Logic =========
// Depends on: app.js (state, $, $$, addDays)

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

// ========= Checkout submit =========
const checkoutForm = $('#checkoutForm');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', e => {
        e.preventDefault();

        const sess = state.session;
        if (!sess) {
            $('#checkoutMsg').textContent = 'Vui lòng đăng nhập trước khi thanh toán.';
            const authModal = $('#authModal');
            if (authModal) {
                authModal.classList.remove('hidden');
                authModal.classList.add('flex');
            }
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

        // Message and Redirect
        $('#checkoutMsg').innerHTML =
            `✅ Thanh toán thành công (demo). License của bạn: <span class="link">${key}</span>. <br><a href="dashboard.html" class="link underline">Đi tới Dashboard</a>`;

        // Optional: Redirect after delay
        // setTimeout(() => window.location.href = 'dashboard.html', 2000);
    });
}

// ========= Query param sync ?plan=PREMIUM|PRO -> select =========
(function syncPlanFromQuery() {
    const m = location.href.match(/[?&]plan=(PREMIUM|PRO)/i);
    const planSelect = $('#planSelect');
    if (m && planSelect) {
        planSelect.value = m[1].toUpperCase();
    }
})();
