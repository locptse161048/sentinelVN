// ✅ Không dùng localStorage - Kiểm tra session qua API
const API_BASE = 'https://sentinelvn.onrender.com';

// ⚠️ SECURITY: Helper function để escape HTML entities (prevent XSS)
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function logout() {
    fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
    }).then(() => {
        window.location.href = '/index.html';
    });
}


/* ===== CHECK ADMIN SESSION ===== */
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        // ✅ SECURITY: Use /api/auth/session (same endpoint as login) to avoid mismatch
        const res = await fetch(`${API_BASE}/api/auth/session`, {
            credentials: "include",
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!res.ok) {
            window.location.href = "index.html";
            return;
        }

        const user = await res.json();

        if (user.role !== 'admin') {
            window.location.href = "index.html";
        }
    } catch (err) {
        console.error("Admin session check failed:", err.message);
        window.location.href = "index.html";
    }
});

const supportContainer = document.getElementById("supportMessages");

async function fetchSupportMessages() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${API_BASE}/api/admin/support`, {
            credentials: "include",
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!res.ok) return [];
        return await res.json();
    } catch (err) {
        console.error("Error fetching support messages:", err);
        return [];
    }
}

async function renderSupportMessages(keyword = "") {
    supportContainer.innerHTML = "Đang tải...";
    let messages = await fetchSupportMessages();

    if (keyword) {
        messages = messages.filter(msg => (msg.email || '').toLowerCase().includes(keyword));
    }

    messages.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const pendingCount = messages.filter(msg => msg.status === 'pending').length;
    const pendingCountEl = document.getElementById('pendingCount');
    if (pendingCountEl) {
        pendingCountEl.textContent = pendingCount;
    }
    // Cập nhật badge số lượng tin nhắn hỗ trợ đang chờ xử lý
    const supportBadge = document.getElementById('supportBadge');
    if (supportBadge) {
        if (pendingCount > 0) {
            supportBadge.textContent = pendingCount > 99 ? '99+' : pendingCount;
            supportBadge.classList.remove('hidden');
            supportBadge.style.display = 'flex';
        } else {
            supportBadge.classList.add('hidden');
            supportBadge.style.display = 'none';
        }
    }
    if (messages.length === 0) {
        supportContainer.innerHTML = `<div class="text-white/50">Không tìm thấy email phù hợp.</div>`;
        return;
    }

    supportContainer.innerHTML = "";
    messages.forEach(msg => {
        const statusText =
            msg.status === "resolved"
                ? '<span class="text-green-400 text-xs">Đã phản hồi</span>'
                : '<span class="text-yellow-400 text-xs">Đang xử lý</span>';

        // ⚠️ SECURITY: Use safe DOM creation instead of innerHTML
        const container = document.createElement('div');
        container.className = 'border border-white/10 rounded-lg p-3 bg-white/5';

        // Header with email & status
        const header = document.createElement('div');
        header.className = 'flex justify-between items-center';

        const emailEl = document.createElement('div');
        emailEl.className = 'text-sm text-brand-400 font-semibold';
        emailEl.textContent = msg.email || '';

        header.appendChild(emailEl);
        header.innerHTML += statusText; // Safe: statusText is hardcoded literal

        // Title & Message (use textContent to prevent XSS)
        const titleEl = document.createElement('div');
        titleEl.className = 'text-sm font-semibold mt-1';
        titleEl.textContent = msg.title;

        const messageEl = document.createElement('div');
        messageEl.className = 'text-sm text-white/80 mt-1';
        messageEl.textContent = msg.message;

        const dateEl = document.createElement('div');
        dateEl.className = 'text-xs text-white/40 mt-2';
        dateEl.textContent = new Date(msg.createdAt).toLocaleString();

        container.appendChild(header);
        container.appendChild(titleEl);
        container.appendChild(messageEl);
        container.appendChild(dateEl);

        // Add button with safe event listener (no inline onclick)
        if (msg.status !== "resolved") {
            const btn = document.createElement('button');
            btn.className = 'mt-2 px-3 py-1 text-xs border border-green-400 rounded hover:bg-green-400/20';
            btn.textContent = 'Đánh dấu hoàn thành';
            btn.addEventListener('click', () => markResolved(msg._id));
            container.appendChild(btn);
        }

        supportContainer.appendChild(container);
    });
}
function showTab(tabId) {
    document.getElementById("supportTab").classList.add("hidden");
    document.getElementById("accountTab").classList.add("hidden");
    document.getElementById("trialTab").classList.add("hidden");

    document.getElementById(tabId).classList.remove("hidden");

    document.getElementById("supportBtn").classList.remove("bg-brand-400/10");
    document.getElementById("accountBtn").classList.remove("bg-brand-400/10");
    document.getElementById("trialBtn").classList.remove("bg-brand-400/10");

    if (tabId === "supportTab") document.getElementById("supportBtn").classList.add("bg-brand-400/10");
    else if (tabId === "accountTab") document.getElementById("accountBtn").classList.add("bg-brand-400/10");
    else if (tabId === "trialTab") document.getElementById("trialBtn").classList.add("bg-brand-400/10");
}

/* ===== ACCOUNT DATA ===== */

async function fetchAccounts() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${API_BASE}/api/admin/clients`, {
            credentials: "include",
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!res.ok) return [];
        return await res.json();
    } catch (err) {
        console.error("Error fetching accounts:", err);
        return [];
    }
}

async function renderAccounts(keyword = "") {
    const accountTable = document.getElementById("accountTable");
    accountTable.innerHTML = "<tr><td colspan='12'>Đang tải...</td></tr>";
    let users = await fetchAccounts();

    if (keyword) {
        users = users.filter(u => (u.email || '').toLowerCase().includes(keyword));
    }

    if (!users.length) {
        accountTable.innerHTML = `<tr><td colspan='12' class='p-4 text-center text-white/50'>Chưa có tài khoản nào</td></tr>`;
        return;
    }

    // ⚠️ SECURITY: Clear innerHTML once, then append safe rows
    accountTable.innerHTML = "";

    users.forEach(user => {
        const isActive = user.status === "đang hoạt động";
        const statusText = isActive ? "Đang hoạt động" : "Tạm ngưng";
        const statusColor = isActive ? "text-green-400" : "text-red-400";

        const licenseStatusMap = { 'active': 'Đang hoạt động', 'tạm ngưng': 'Tạm ngưng', 'expired': 'Hết hạn' };
        const licenseStatusText = licenseStatusMap[user.licenseStatus] || '-';
        const licenseStatusColor = user.licenseStatus === 'active' ? 'text-green-400' : 'text-red-400';

        const genderMap = { 'nam': 'Nam', 'nữ': 'Nữ', 'khác': 'Khác' };
        const genderText = user.gender ? genderMap[user.gender] : '-';

        const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : '-';
        const licenseCreatedDate = user.licenseCreatedAt ? new Date(user.licenseCreatedAt).toLocaleDateString("vi-VN") : '-';
        const licenseExpiresDate = user.licenseExpiresAt ? new Date(user.licenseExpiresAt).toLocaleDateString("vi-VN") : '-';

        // Create table row safely
        const tr = document.createElement('tr');
        tr.className = 'border-t border-white/10 hover:bg-white/5';

        // License Key Cell
        const tdLicense = document.createElement('td');
        tdLicense.className = 'p-2 truncate relative group';
        const licenseSpan = document.createElement('span');
        licenseSpan.textContent = user.licenseKey || '-';
        const licenseCopyBtn = document.createElement('button');
        licenseCopyBtn.className = 'absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-xs px-2 py-1 border border-cyan-400 rounded hover:bg-cyan-400/20 transition';
        licenseCopyBtn.textContent = '📋';
        licenseCopyBtn.title = 'Copy License Key';
        licenseCopyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyToClipboard(user.licenseKey || '', licenseCopyBtn);
        });
        tdLicense.appendChild(licenseSpan);
        tdLicense.appendChild(licenseCopyBtn);

        // Email Cell
        const tdEmail = document.createElement('td');
        tdEmail.className = 'p-2 truncate relative group';
        const emailSpan = document.createElement('span');
        emailSpan.textContent = user.email;
        const emailCopyBtn = document.createElement('button');
        emailCopyBtn.className = 'absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-xs px-2 py-1 border border-cyan-400 rounded hover:bg-cyan-400/20 transition';
        emailCopyBtn.textContent = '📋';
        emailCopyBtn.title = 'Copy Email';
        emailCopyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyToClipboard(user.email, emailCopyBtn);
        });
        tdEmail.appendChild(emailSpan);
        tdEmail.appendChild(emailCopyBtn);

        // Other cells - use textContent for safety
        const createSafeTd = (content, extraClass = '') => {
            const td = document.createElement('td');
            td.className = `p-2 truncate ${extraClass}`;
            td.textContent = content;
            return td;
        };

        tr.appendChild(tdLicense);
        tr.appendChild(tdEmail);
        tr.appendChild(createSafeTd(genderText));
        tr.appendChild(createSafeTd(user.phone || '-'));
        tr.appendChild(createSafeTd(user.address || '-'));
        tr.appendChild(createSafeTd(statusText, statusColor));
        tr.appendChild(createSafeTd(createdDate));
        tr.appendChild(createSafeTd(user.plan || '-'));
        tr.appendChild(createSafeTd(licenseStatusText, licenseStatusColor));
        tr.appendChild(createSafeTd(licenseCreatedDate));
        tr.appendChild(createSafeTd(licenseExpiresDate));

        // Action menu cell with safe event listeners
        const tdAction = document.createElement('td');
        tdAction.className = 'p-2 relative';
        const dropdownDiv = document.createElement('div');
        dropdownDiv.className = 'dropdown-menu';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'dropdown-toggle';
        toggleBtn.textContent = '⋮ Menu';
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown(toggleBtn);
        });

        const contentDiv = document.createElement('div');
        contentDiv.className = 'dropdown-content';

        const planBtn = document.createElement('button');
        planBtn.className = 'text-brand-400';
        planBtn.textContent = 'Đổi gói';
        planBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePlan(user._id);
        });

        const extendBtn = document.createElement('button');
        extendBtn.className = 'text-green-400';
        extendBtn.textContent = 'Gia hạn 30 ngày';
        extendBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            extendUser(user._id);
        });

        const statusBtn = document.createElement('button');
        statusBtn.className = 'text-yellow-400';
        statusBtn.textContent = 'Đổi trạng thái';
        statusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleStatus(user._id);
        });

        contentDiv.appendChild(planBtn);
        contentDiv.appendChild(extendBtn);
        contentDiv.appendChild(statusBtn);

        dropdownDiv.appendChild(toggleBtn);
        dropdownDiv.appendChild(contentDiv);
        tdAction.appendChild(dropdownDiv);

        tr.appendChild(tdAction);
        accountTable.appendChild(tr);
    });

    initResizeColumns();
}

async function deleteUser(userId) {
    if (!confirm("Bạn có chắc muốn xóa tài khoản này?")) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/client/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!res.ok) { alert('Không thể xóa tài khoản'); return; }
        renderAccounts();
    } catch (err) {
        console.error("Error deleting user:", err);
        alert('Lỗi khi xóa tài khoản');
    }
}

async function togglePlan(userId) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/client/${userId}/toggle-plan`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) { alert('Không thể đổi gói'); return; }
        renderAccounts();
    } catch (err) {
        console.error("Error toggling plan:", err);
        alert('Lỗi khi đổi gói');
    }
}

async function extendUser(userId) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/client/${userId}/extend`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) { alert('Không thể gia hạn tài khoản'); return; }
        renderAccounts();
    } catch (err) {
        console.error("Error extending user:", err);
        alert('Lỗi khi gia hạn');
    }
}

async function toggleStatus(userId) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/client/${userId}/toggle-status`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) { alert('Không thể đổi trạng thái'); return; }
        renderAccounts();
    } catch (err) {
        console.error("Error toggling status:", err);
        alert('Lỗi khi đổi trạng thái');
    }
}

function handleAccountSearch() {
    const keyword = document.getElementById("accountSearch").value.toLowerCase();
    renderAccounts(keyword);
}

async function markResolved(messageId) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/support/${messageId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'resolved' })
        });

        if (!res.ok) { alert('Không thể cập nhật trạng thái'); return; }
        renderSupportMessages();
    } catch (err) {
        console.error("Error marking resolved:", err);
        alert('Lỗi khi cập nhật trạng thái');
    }
}

function handleSupportSearch() {
    const keyword = document.getElementById("supportSearch").value.toLowerCase();
    renderSupportMessages(keyword);
}

/* ===== DROPDOWN MENU ===== */
function toggleDropdown(btn) {
    event.stopPropagation();
    const content = btn.nextElementSibling;
    const isShowing = content.classList.contains('show');

    document.querySelectorAll('.dropdown-content.show').forEach(el => {
        el.classList.remove('show');
    });

    if (!isShowing) {
        content.classList.add('show');
    }
}
// Đóng dropdown khi click ra ngoài
document.addEventListener('click', function (event) {
    if (!event.target.closest('.dropdown-menu')) {
        document.querySelectorAll('.dropdown-content.show').forEach(el => {
            el.classList.remove('show');
            el.style.top = '';
            el.style.left = '';
            el.style.visibility = '';
        });
    }
});

/* ===== COPY TO CLIPBOARD ===== */
function copyToClipboard(text, btn) {
    event.stopPropagation();
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied';
        btn.classList.add('bg-green-400/20');

        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('bg-green-400/20');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

/* ===== RESIZABLE TABLE COLUMNS ===== */
let resizingCol = null;
let startX = 0;
let startWidth = 0;

function initResizeColumns() {
    const handles = document.querySelectorAll('.resize-handle');

    handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            resizingCol = e.target.parentElement;
            startX = e.clientX;
            startWidth = resizingCol.offsetWidth;

            handle.classList.add('active');
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
}

function onMouseMove(e) {
    if (!resizingCol) return;
    const diff = e.clientX - startX;
    const newWidth = Math.max(80, startWidth + diff);
    resizingCol.style.width = newWidth + 'px';
}

function onMouseUp() {
    if (resizingCol) {
        resizingCol.querySelector('.resize-handle').classList.remove('active');
    }
    resizingCol = null;
    document.body.style.userSelect = 'auto';
    document.body.style.cursor = 'auto';
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}
/* ===== TRIAL CONTACT ===== */
const trialContainer = document.getElementById("trialMessages");

async function fetchTrialContacts() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${API_BASE}/api/trial-contacts`, {
            credentials: "include",
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!res.ok) return [];
        return await res.json();
    } catch (err) {
        console.error("Error fetching trial contacts:", err);
        return [];
    }
}

async function renderTrialContacts(keyword = "") {
    trialContainer.innerHTML = "Đang tải...";
    let contacts = await fetchTrialContacts();

    if (keyword) {
        contacts = contacts.filter(c => (c.email || '').toLowerCase().includes(keyword));
    }

    contacts.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const pendingCount = contacts.filter(c => c.status === 'pending').length;
    const pendingCountEl = document.getElementById('trialPendingCount');
    if (pendingCountEl) pendingCountEl.textContent = pendingCount;
    const trialBadge = document.getElementById('trialBadge');
    if (trialBadge) {
        if (pendingCount > 0) {
            trialBadge.textContent = pendingCount > 99 ? '99+' : pendingCount;
            trialBadge.classList.remove('hidden');
            trialBadge.style.display = 'flex';
        } else {
            trialBadge.classList.add('hidden');
            trialBadge.style.display = 'none';
        }
    }

    if (contacts.length === 0) {
        trialContainer.innerHTML = `<div class="text-white/50">Không tìm thấy yêu cầu phù hợp.</div>`;
        return;
    }

    trialContainer.innerHTML = "";
    contacts.forEach(c => {
        const statusText = c.status === "resolved"
            ? '<span class="text-green-400 text-xs">Đã xử lý</span>'
            : '<span class="text-yellow-400 text-xs">Chờ xử lý</span>';

        // ⚠️ SECURITY: Use safe DOM creation instead of innerHTML
        const container = document.createElement('div');
        container.className = 'border border-white/10 rounded-lg p-3 bg-white/5';

        // Header with email & status
        const header = document.createElement('div');
        header.className = 'flex justify-between items-center';

        const emailEl = document.createElement('div');
        emailEl.className = 'text-sm text-brand-400 font-semibold';
        emailEl.textContent = c.email || '';

        header.appendChild(emailEl);
        header.innerHTML += statusText; // Safe: statusText is hardcoded literal

        // Name & Message (use textContent to prevent XSS)
        const nameEl = document.createElement('div');
        nameEl.className = 'text-sm font-semibold mt-1';
        nameEl.textContent = c.name || '';

        const messageEl = document.createElement('div');
        messageEl.className = 'text-sm text-white/80 mt-1';
        messageEl.textContent = c.message;

        const dateEl = document.createElement('div');
        dateEl.className = 'text-xs text-white/40 mt-2';
        dateEl.textContent = new Date(c.createdAt).toLocaleString();

        container.appendChild(header);
        container.appendChild(nameEl);
        container.appendChild(messageEl);
        container.appendChild(dateEl);

        // Add button with safe event listener (no inline onclick)
        if (c.status !== "resolved") {
            const btn = document.createElement('button');
            btn.className = 'mt-2 px-3 py-1 text-xs border border-green-400 rounded hover:bg-green-400/20';
            btn.textContent = 'Đánh dấu hoàn thành';
            btn.addEventListener('click', () => markTrialResolved(c._id));
            container.appendChild(btn);
        }

        trialContainer.appendChild(container);
    });
}

async function markTrialResolved(id) {
    try {
        const res = await fetch(`${API_BASE}/api/trial-contact/${id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'resolved' })
        });
        if (!res.ok) { alert('Không thể cập nhật trạng thái'); return; }
        renderTrialContacts();
    } catch (err) {
        console.error("Error marking trial resolved:", err);
        alert('Lỗi khi cập nhật trạng thái');
    }
}

function handleTrialSearch() {
    const keyword = document.getElementById("trialSearch").value.toLowerCase();
    renderTrialContacts(keyword);
}
setInterval(async () => {
    // Support badge
    const messages = await fetchSupportMessages();
    const supportPending = messages.filter(msg => msg.status === 'pending').length;
    const supportBadge = document.getElementById('supportBadge');
    if (supportBadge) {
        if (supportPending > 0) {
            supportBadge.textContent = supportPending > 99 ? '99+' : supportPending;
            supportBadge.classList.remove('hidden');
            supportBadge.style.display = 'flex';
        } else {
            supportBadge.classList.add('hidden');
            supportBadge.style.display = 'none';
        }
    }

    // Trial badge
    const contacts = await fetchTrialContacts();
    const trialPending = contacts.filter(c => c.status === 'pending').length;
    const trialBadge = document.getElementById('trialBadge');
    if (trialBadge) {
        if (trialPending > 0) {
            trialBadge.textContent = trialPending > 99 ? '99+' : trialPending;
            trialBadge.classList.remove('hidden');
            trialBadge.style.display = 'flex';
        } else {
            trialBadge.classList.add('hidden');
            trialBadge.style.display = 'none';
        }
    }
}, 30000);
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
        window.location.href = 'index.html'; 
    }, IDLE_TIMEOUT);
}

// Các sự kiện được coi là "có hoạt động"
['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetIdleTimer, { passive: true });
});

// Bắt đầu đếm ngay khi load trang
resetIdleTimer();
renderSupportMessages();
renderAccounts();
renderTrialContacts();