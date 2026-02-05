// ========= License Dashboard Logic =========
// Depends on: app.js (state, $, $$, fmtDate, addDays)

function renderLicenses() {
    const sess = state.session;
    if (!sess) return;
    const email = sess.email;

    const list = (state.licenses[email] || []).sort((a, b) => b.createdAt - a.createdAt);
    const tbody = $('#licenseTbody');
    if (!tbody) return; // Guard if not on dashboard page

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

    // Event delegation or binding for buttons
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
const activateForm = $('#activateForm');
if (activateForm) {
    activateForm.addEventListener('submit', e => {
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
}

// Initialize
// Check if we are on dashboard page and logged in
if ($('#licenseTbody')) {
    renderLicenses();
}
