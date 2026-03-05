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
    
    // Tìm kiếm chỉ theo email
    if (keyword) {
        messages = messages.filter(msg => (msg.email || '').toLowerCase().includes(keyword));
    }
    
    // Sắp xếp: pending messages lên trên, sau đó resolved messages
    // Trong mỗi nhóm, sắp xếp theo createdAt (cũ lên trên, mới xuống dưới)
    messages.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(a.createdAt) - new Date(b.createdAt);
    });
    
    // Cập nhật số lượng tin nhắn pending
    const pendingCount = messages.filter(msg => msg.status === 'pending').length;
    const pendingCountEl = document.getElementById('pendingCount');
    if (pendingCountEl) {
        pendingCountEl.textContent = pendingCount;
    }
    
    if (messages.length === 0) {
        supportContainer.innerHTML = `<div class=\"text-white/50\">Không tìm thấy email phù hợp.</div>`;
        return;
    }
    supportContainer.innerHTML = "";
    messages.forEach(msg => {
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
    accountTable.innerHTML = "<tr><td colspan='12'>Đang tải...</td></tr>";
    let users = await fetchAccounts();
    if (keyword) {
        users = users.filter(u => (u.email || '').toLowerCase().includes(keyword));
    }
    if (!users.length) {
        accountTable.innerHTML = `<tr><td colspan='12' class='p-4 text-center text-white/50'>Chưa có tài khoản nào</td></tr>`;
        return;
    }
    users.forEach(user => {
        const isActive = user.status === "đang hoạt động";
        const statusText = isActive ? "Đang hoạt động" : "Tạm ngưng";
        const statusColor = isActive ? "text-green-400" : "text-red-400";
        
        const licenseStatusMap = { 'active': 'Đang hoạt động', 'tạm ngưng': 'Tạm ngưng', 'expired': 'Hết hạn' };
        const licenseStatusText = licenseStatusMap[user.licenseStatus] || '-';
        const licenseStatusColor = user.licenseStatus === 'active' ? 'text-green-400' : (user.licenseStatus === 'tạm ngưng' ? 'text-yellow-400' : 'text-red-400');
        
        const genderMap = { 'nam': 'Nam', 'nữ': 'Nữ', 'khác': 'Khác' };
        const genderText = user.gender ? genderMap[user.gender] : '-';
        const phoneText = user.phone || '-';
        const addressText = user.address || '-';
        
        const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : '-';
        const licenseCreatedDate = user.licenseCreatedAt ? new Date(user.licenseCreatedAt).toLocaleDateString("vi-VN") : '-';
        const licenseExpiresDate = user.licenseExpiresAt ? new Date(user.licenseExpiresAt).toLocaleDateString("vi-VN") : '-';
        
        accountTable.innerHTML += `
            <tr class="border-t border-white/10 hover:bg-white/5">
                <td class="p-2 truncate flex items-center gap-2 group">
                    <span>${user.licenseKey || '-'}</span>
                    <button class="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 border border-cyan-400 rounded hover:bg-cyan-400/20 transition" onclick="copyToClipboard('${user.licenseKey || ''}', this)">📋</button>
                </td>
                <td class="p-2 truncate flex items-center gap-2 group">
                    <span>${user.email}</span>
                    <button class="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 border border-cyan-400 rounded hover:bg-cyan-400/20 transition" onclick="copyToClipboard('${user.email}', this)">📋</button>
                </td>
                <td class="p-2 truncate">${genderText}</td>
                <td class="p-2 truncate">${phoneText}</td>
                <td class="p-2 truncate">${addressText}</td>
                <td class="p-2 truncate ${statusColor}">${statusText}</td>
                <td class="p-2 truncate">${createdDate}</td>
                <td class="p-2 truncate">${user.plan || '-'}</td>
                <td class="p-2 truncate ${licenseStatusColor}">${licenseStatusText}</td>
                <td class="p-2 truncate">${licenseCreatedDate}</td>
                <td class="p-2 truncate">${licenseExpiresDate}</td>
                <td class="p-2 relative">
                    <div class="dropdown-menu">
                        <button class="dropdown-toggle" onclick="event.stopPropagation(); toggleDropdown(this)">⋮ Menu</button>
                        <div class="dropdown-content">
                            <button onclick="event.stopPropagation(); togglePlan('${user._id}')" class="text-brand-400">Đổi gói</button>
                            <button onclick="event.stopPropagation(); extendUser('${user._id}')" class="text-green-400">Gia hạn 30 ngày</button>
                            <button onclick="event.stopPropagation(); toggleStatus('${user._id}')" class="text-yellow-400">Đổi trạng thái</button>
                        </div>
                    </div>
                </td>
            </tr>`;
    });
    
    // Khởi tạo resize columns sau khi render
    initResizeColumns();
}

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

/* ===== DROPDOWN MENU ===== */
function toggleDropdown(btn) {
    event.stopPropagation();
    const content = btn.nextElementSibling;
    
    // Close all other dropdowns
    document.querySelectorAll('.dropdown-content.show').forEach(el => {
        if (el !== content) el.classList.remove('show');
    });
    
    content.classList.toggle('show');
}

// Close dropdown khi click ngoài
document.addEventListener('click', function(event) {
    // Không đóng nếu click trên button hoặc dropdown content
    if (!event.target.closest('.dropdown-menu')) {
        document.querySelectorAll('.dropdown-content.show').forEach(el => el.classList.remove('show'));
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
    const newWidth = Math.max(60, startWidth + diff);
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

renderSupportMessages();
renderAccounts();
