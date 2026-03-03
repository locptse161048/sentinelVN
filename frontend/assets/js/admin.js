// ✅ Không dùng localStorage - Kiểm tra session qua API
const API_BASE = 'https://sentinelvn.onrender.com';

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

        const res = await fetch(`${API_BASE}/api/auth/me`, {
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
        messages = messages.filter(msg => (msg.title || '').toLowerCase().includes(keyword));
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
                <div class=\"text-sm text-brand-400 font-semibold\">${msg.email || ''}</div>
                ${statusText}
            </div>
            <div class=\"text-sm font-semibold mt-1\">${msg.title}</div>
            <div class=\"text-sm text-white/80 mt-1\">${msg.message}</div>
            <div class=\"text-xs text-white/40 mt-2\">${new Date(msg.createdAt).toLocaleString()}</div>
            ${msg.status !== "resolved"
                ? `<button onclick=\"markResolved('${msg._id}')\" class=\"mt-2 px-3 py-1 text-xs border border-green-400 rounded hover:bg-green-400/20\">Đánh dấu hoàn thành</button>`
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
                        <td class=\"p-2\">${user.plan || 'Free'}<\/td>
                        <td class=\"p-2\">${user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : '-'}<\/td>
                        <td class=\"p-2\">-<\/td>
                        <td class=\"p-2 space-x-3\">
                                <button onclick=\"deleteUser('${user._id}')\" class=\"px-2 py-1 text-xs border border-red-400 rounded hover:bg-red-400/20\">Xóa</button>
                                <button onclick=\"togglePlan('${user._id}')\" class=\"px-2 py-1 text-xs border border-brand-400 rounded hover:bg-brand-400/20\">Đổi gói</button>
                                <button onclick=\"extendUser('${user._id}')\" class=\"px-2 py-1 text-xs border border-green-400 rounded hover:bg-green-400/20\">Gia hạn 30 ngày</button>
                                <button onclick=\"toggleStatus('${user._id}')\" class=\"px-2 py-1 text-xs border border-yellow-400 rounded hover:bg-yellow-400/20\">Đổi trạng thái</button>
                        </td>
                </tr>`;
    });
}

renderAccounts();

async function deleteUser(userId) {
    if (!confirm("Bạn có chắc muốn xóa tài khoản này?")) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/client/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!res.ok) {
            alert('Không thể xóa tài khoản');
            return;
        }

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

        if (!res.ok) {
            alert('Không thể đổi gói');
            return;
        }

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

        if (!res.ok) {
            alert('Không thể gia hạn tài khoản');
            return;
        }

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

        if (!res.ok) {
            alert('Không thể đổi trạng thái');
            return;
        }

        renderAccounts();
    } catch (err) {
        console.error("Error toggling status:", err);
        alert('Lỗi khi đổi trạng thái');
    }
}

function handleAccountSearch() {
    const keyword = document
        .getElementById("accountSearch")
        .value
        .toLowerCase();

    renderAccounts(keyword);
}
renderAccounts();

async function markResolved(messageId) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/support/${messageId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'resolved' })
        });

        if (!res.ok) {
            alert('Không thể cập nhật trạng thái');
            return;
        }

        renderSupportMessages();
    } catch (err) {
        console.error("Error marking resolved:", err);
        alert('Lỗi khi cập nhật trạng thái');
    }
}
function handleSupportSearch() {
    const keyword = document
        .getElementById("supportSearch")
        .value
        .toLowerCase();

    renderSupportMessages(keyword);
}
renderSupportMessages();
