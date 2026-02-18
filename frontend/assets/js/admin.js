const sess = JSON.parse(localStorage.getItem('sentinel_session'));
if (!sess || sess.role !== 'admin') location.href = '/index.html';

function logout() {
    localStorage.removeItem('sentinel_session');
    location.href = '/index.html';
}

/* ===== SUPPORT MESSAGES ===== */

const API_BASE = 'https://sentinelvn.onrender.com';
const supportContainer = document.getElementById("supportMessages");
async function fetchSupportMessages() {
    const res = await fetch(`${API_BASE}/support`);
    if (!res.ok) return [];
    return await res.json();
}

async function renderSupportMessages(keyword = "") {
    supportContainer.innerHTML = "Đang tải...";
    let messages = await fetchSupportMessages();
    if (keyword) {
        messages = messages.filter(msg => (msg.subject || '').toLowerCase().includes(keyword));
    }
    if (messages.length === 0) {
        supportContainer.innerHTML = `<div class=\"text-white/50\">Không tìm thấy tin nhắn phù hợp.</div>`;
        return;
    }
    supportContainer.innerHTML = "";
    [...messages].reverse().forEach(msg => {
        const statusText =
            msg.status === "resolved"
                ? '<span class="text-green-400 text-xs">Đã phản hồi</span>'
                : '<span class="text-yellow-400 text-xs">Đang xử lý</span>';
        supportContainer.innerHTML += `
        <div class=\"border border-white/10 rounded-lg p-3 bg-white/5\">
            <div class=\"flex justify-between items-center\">
                <div class=\"text-sm text-brand-400 font-semibold\">${msg.clientId || ''}</div>
                ${statusText}
            </div>
            <div class=\"text-sm font-semibold mt-1\">${msg.subject}</div>
            <div class=\"text-sm text-white/80 mt-1\">${msg.message}</div>
            <div class=\"text-xs text-white/40 mt-2\">${new Date(msg.createdAt).toLocaleString()}</div>
            ${msg.status !== "resolved"
                ? `<button onclick=\"markResolved('${msg.id}')\" class=\"mt-2 px-3 py-1 text-xs border border-green-400 rounded hover:bg-green-400/20\">Đánh dấu hoàn thành</button>`
                : ""
            }
        </div>`;
    });
}

renderSupportMessages();

function showTab(tabId) {

    document.getElementById("supportTab").classList.add("hidden");
    document.getElementById("accountTab").classList.add("hidden");

    document.getElementById(tabId).classList.remove("hidden");

    document.getElementById("supportBtn").classList.remove("bg-brand-400/10");
    document.getElementById("accountBtn").classList.remove("bg-brand-400/10");

    if (tabId === "supportTab") {
        document.getElementById("supportBtn").classList.add("bg-brand-400/10");
    } else {
        document.getElementById("accountBtn").classList.add("bg-brand-400/10");
    }
}


/* ===== ACCOUNT DATA ===== */

async function fetchAccounts() {
        const res = await fetch(`${API_BASE}/admin/clients`, {
                headers: { 'Authorization': `Bearer ${sess.token}` }
        });
        if (!res.ok) return [];
        return await res.json();
}

async function renderAccounts(keyword = "") {
        const accountTable = document.getElementById("accountTable");
        accountTable.innerHTML = "<tr><td colspan='7'>Đang tải...</td></tr>";
        let users = await fetchAccounts();
        if (keyword) {
                users = users.filter(u => (u.email || '').toLowerCase().includes(keyword));
        }
        if (!users.length) {
                accountTable.innerHTML = `<tr><td colspan='7' class='p-4 text-center text-white/50'>Chưa có tài khoản nào</td></tr>`;
                return;
        }
        users.forEach(user => {
                const isActive = user.status === "đang hoạt động";
                const statusText = isActive ? "Đang hoạt động" : "Tạm ngưng";
                const statusColor = isActive ? "text-green-400" : "text-red-400";
                accountTable.innerHTML += `
                <tr class=\"border-t border-white/10\">
                        <td class=\"p-2\">${user.licenseKey || '-'}<\/td>
                        <td class=\"p-2\">${user.email}<\/td>
                        <td class=\"p-2 ${statusColor}\">${statusText}<\/td>
                        <td class=\"p-2\">${user.plan || '-'}<\/td>
                        <td class=\"p-2\">${user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : '-'}<\/td>
                        <td class=\"p-2\">${user.expiresAt ? new Date(user.expiresAt).toLocaleDateString("vi-VN") : '-'}<\/td>
                        <td class=\"p-2 space-x-3\">
                                <button onclick=\"deleteUser('${user.id}')\" class=\"px-2 py-1 text-xs border border-red-400 rounded hover:bg-red-400/20\">Xóa</button>
                                <button onclick=\"togglePlan('${user.id}')\" class=\"px-2 py-1 text-xs border border-brand-400 rounded hover:bg-brand-400/20\">Đổi gói</button>
                                <button onclick=\"extendUser('${user.id}')\" class=\"px-2 py-1 text-xs border border-green-400 rounded hover:bg-green-400/20\">Gia hạn 30 ngày</button>
                                <button onclick=\"toggleStatus('${user.id}')\" class=\"px-2 py-1 text-xs border border-yellow-400 rounded hover:bg-yellow-400/20\">Đổi trạng thái</button>
                        </td>
                </tr>`;
        });
}

renderAccounts();
function deleteUser(email) {
    if (!confirm("Bạn có chắc muốn xóa tài khoản này?")) return;

    const users = JSON.parse(localStorage.getItem(LS_USERS) || "{}");
    delete users[email];
    localStorage.setItem(LS_USERS, JSON.stringify(users));

    renderAccounts();
}

function togglePlan(email) {
    const users = JSON.parse(localStorage.getItem(LS_USERS) || "{}");

    if (users[email].plan === "Free") {
        users[email].plan = "PREMIUM";
    } else if (users[email].plan === "PREMIUM") {
        users[email].plan = "PRO";
    } else {
        users[email].plan = "Free";
    }

    localStorage.setItem(LS_USERS, JSON.stringify(users));
    renderAccounts();
}
function extendUser(email) {
    const users = JSON.parse(localStorage.getItem(LS_USERS) || "{}");
    if (!users[email]) return;
    const currentExpire = new Date(users[email].expiresAt);
    const newExpire = new Date(
        currentExpire.getTime() + 30 * 24 * 60 * 60 * 1000
    );
    users[email].expiresAt = newExpire.toISOString();

    localStorage.setItem(LS_USERS, JSON.stringify(users));

    renderAccounts();
}
function toggleStatus(email) {
    const users = JSON.parse(localStorage.getItem(LS_USERS) || "{}");
    if (!users[email]) return;

    if (!users[email].status) {
        users[email].status = "active";
    }

    users[email].status =
        users[email].status === "active"
            ? "suspended"
            : "active";

    localStorage.setItem(LS_USERS, JSON.stringify(users));

    renderAccounts();
}

function handleAccountSearch() {
    const keyword = document
        .getElementById("accountSearch")
        .value
        .toLowerCase();

    renderAccounts(keyword);
}
renderAccounts();
function markResolved(id) {
    const messages = JSON.parse(
        localStorage.getItem("support_messages") || "[]"
    );

    const index = messages.findIndex(m => m.id === id);
    if (index === -1) return;

    messages[index].status = "resolved";

    localStorage.setItem("support_messages", JSON.stringify(messages));

    location.reload(); // reload để cập nhật giao diện
}
function handleSupportSearch() {
    const keyword = document
        .getElementById("supportSearch")
        .value
        .toLowerCase();

    renderSupportMessages(keyword);
}
renderSupportMessages();
