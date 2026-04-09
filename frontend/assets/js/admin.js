// ✅ Sử dụng token-based auth via Authorization header
const API_BASE = 'https://sentinelvn.onrender.com';

// ✅ WebSocket initialization
let socket = null;

// ✅ Helper function to add Authorization header automatically
function getAuthHeaders(customHeaders = {}) {
    const token = localStorage.getItem('auth_token');
    const headers = {
        'Content-Type': 'application/json',
        ...customHeaders
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

// ✅ Monkey-patch fetch to auto-add Authorization header (if not already present)
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const [resource, config = {}] = args;
    const token = localStorage.getItem('auth_token');
    
    if (token && (!config.headers || !config.headers['Authorization'])) {
        config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    
    // Remove credentials since we're using headers now
    if (config.credentials) {
        delete config.credentials;
    }
    
    return originalFetch(resource, config);
};

// ⚠️ SECURITY: Helper function để escape HTML entities (prevent XSS)
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function logout() {
    // Note: fetch auto-injection will add token header
    fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST"
    }).then(() => {
        localStorage.removeItem('auth_token');
        if (socket) socket.disconnect();
        window.location.href = '/index.html';
    });
}


/* ===== CHECK ADMIN SESSION ===== */
document.addEventListener("DOMContentLoaded", async () => {
    console.log('[ADMIN] Page loaded, checking session...');
    try {
        // 🔑 Get token from localStorage
        const token = localStorage.getItem('auth_token');
        console.log('[ADMIN] Token from localStorage:', token ? token.substring(0, 30) + '...' : 'missing');
        
        if (!token) {
            console.log('[ADMIN] No token, redirecting to index...');
            window.location.href = "index.html";
            return;
        }
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        // ✅ Send token via Authorization header
        const res = await fetch(`${API_BASE}/api/auth/session`, {
            headers: getAuthHeaders(),
            signal: controller.signal,
            method: "GET"
        });

        clearTimeout(timeout);

        if (!res.ok) {
            console.error('[AUTH] Session check failed:', res.status, res.statusText);
            localStorage.removeItem('auth_token');
            window.location.href = "index.html";
            return;
        }

        const user = await res.json();
        console.log('[AUTH] User verified:', user.email, 'Role:', user.role);

        if (user.role !== 'admin') {
            console.error('[AUTH] User is not admin:', user.role);
            localStorage.removeItem('auth_token');
            window.location.href = "index.html";
            return;
        }

        console.log('[AUTH] Admin verified:', user.email);

        // ✅ Initialize WebSocket connection after session verification
        try {
            initializeWebSocket();
        } catch (wsErr) {
            console.error('[SOCKET] WebSocket initialization failed:', wsErr);
            // Don't block page load if WebSocket fails - it's not critical
        }

        // Load initial data - show support tab first
        try {
            console.log('[ADMIN] Loading initial data...');
            showTab('supportTab');
        } catch (dataErr) {
            console.error('[ADMIN] Failed to load initial data:', dataErr);
            // Show error but don't redirect
            alert('Lỗi: Không thể tải dữ liệu. Vui lòng reload trang.');
        }
    } catch (err) {
        console.error("Admin session check failed:", err.message);
        window.location.href = "index.html";
    }
});

/* ===== WEBSOCKET CONNECTION ===== */
function initializeWebSocket() {
    console.log('[SOCKET] Initializing WebSocket connection...');
    
    // Dynamically add socket.io client script if not already loaded
    if (!window.io) {
        const script = document.createElement('script');
        script.src = `${API_BASE}/socket.io/socket.io.js`;
        script.async = true;
        script.onload = () => {
            console.log('[SOCKET] Socket.io client loaded from server');
            // Small delay to ensure window.io is available
            setTimeout(connectWebSocket, 100);
        };
        script.onerror = () => {
            console.warn('[SOCKET] Failed to load socket.io client from server, trying CDN...');
            const cdnScript = document.createElement('script');
            cdnScript.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
            cdnScript.async = true;
            cdnScript.onload = () => {
                console.log('[SOCKET] Socket.io client loaded from CDN');
                setTimeout(connectWebSocket, 100);
            };
            cdnScript.onerror = () => {
                console.error('[SOCKET] Failed to load socket.io from both server and CDN');
            };
            document.head.appendChild(cdnScript);
        };
        document.head.appendChild(script);
    } else {
        console.log('[SOCKET] Socket.io already available');
        setTimeout(connectWebSocket, 100);
    }
}

function connectWebSocket() {
    if (socket && socket.connected) {
        console.log('[SOCKET] Already connected');
        return;
    }

    // Check if io is available
    if (!window.io) {
        console.error('[SOCKET] window.io is not available');
        setTimeout(connectWebSocket, 500); // Retry after 500ms
        return;
    }

    try {
        socket = window.io(API_BASE, {
            withCredentials: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        socket.on('connect', () => {
            console.log('[SOCKET] Connected to server ✅');
        });

        socket.on('connect_error', (error) => {
            console.error('[SOCKET] Connection error:', error);
        });

        socket.on('disconnect', () => {
            console.log('[SOCKET] Disconnected from server');
        });

        // ✅ Listen for new client registration
        socket.on('new_client_registered', (newClient) => {
            console.log('[SOCKET] Received new_client_registered event:', newClient);
            
            // Only update if we're on the account tab
            const accountTab = document.getElementById('accountTab');
            if (!accountTab.classList.contains('hidden')) {
                // Refetch and re-render accounts to include the new client
                refreshAccountsList();
            }
            
            // Show a notification
            showNotification(`🎉 Tài khoản mới: ${newClient.email}`);
        });

        // ✅ Listen for new support messages
        socket.on('new_support_message', (newMessage) => {
            console.log('[SOCKET] Received new_support_message event:', newMessage);
            
            // Only update if we're on the support tab
            const supportTab = document.getElementById('supportTab');
            if (!supportTab.classList.contains('hidden')) {
                // Refetch and re-render support messages
                refreshSupportMessages();
            }
            
            // Show a notification
            showNotification(`💬 Tin nhắn mới từ: ${newMessage.email}`);
        });

        // ✅ Listen for new trial contacts
        socket.on('new_trial_contact', (newTrialContact) => {
            console.log('[SOCKET] Received new_trial_contact event:', newTrialContact);
            
            // Only update if we're on the trial tab
            const trialTab = document.getElementById('trialTab');
            if (!trialTab.classList.contains('hidden')) {
                // Refetch and re-render trial contacts
                refreshTrialContacts();
            }
            
            // Show a notification
            showNotification(`📝 Yêu cầu dùng thử mới từ: ${newTrialContact.email}`);
        });

        socket.on('error', (error) => {
            console.error('[SOCKET] Socket error:', error);
        });

    } catch (err) {
        console.error('[SOCKET] Connection error:', err);
    }
}

/* ===== NOTIFICATION HELPER ===== */
function showNotification(message) {
    // Create notification element
    const notif = document.createElement('div');
    notif.className = 'fixed top-4 right-4 bg-brand-400 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-slideIn';
    notif.style.animation = 'slideIn 0.3s ease-out';
    notif.textContent = message;
    document.body.appendChild(notif);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

/* ===== REFRESH FUNCTIONS FOR WEBSOCKET UPDATES ===== */
function refreshAccountsList() {
    console.log('[ADMIN] Refreshing accounts list...');
    const keyword = document.getElementById("accountSearch").value.toLowerCase();
    renderAccounts(keyword);
}

function refreshSupportMessages() {
    console.log('[ADMIN] Refreshing support messages...');
    const keyword = document.getElementById("supportSearch").value.toLowerCase();
    renderSupportMessages(keyword);
}

function refreshTrialContacts() {
    console.log('[ADMIN] Refreshing trial contacts...');
    const keyword = document.getElementById("trialSearch").value.toLowerCase();
    renderTrialContacts(keyword);
}

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
    const supportContainer = document.getElementById("supportMessages");
    if (!supportContainer) {
        console.error('[ADMIN] Support container not found in DOM');
        return;
    }

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
    document.getElementById("statsTab").classList.add("hidden");

    document.getElementById(tabId).classList.remove("hidden");

    document.getElementById("supportBtn").classList.remove("bg-brand-400/10");
    document.getElementById("accountBtn").classList.remove("bg-brand-400/10");
    document.getElementById("trialBtn").classList.remove("bg-brand-400/10");
    document.getElementById("statsBtn").classList.remove("bg-brand-400/10");

    if (tabId === "supportTab") {
        document.getElementById("supportBtn").classList.add("bg-brand-400/10");
        renderSupportMessages();
    } else if (tabId === "accountTab") {
        document.getElementById("accountBtn").classList.add("bg-brand-400/10");
        renderAccounts();
    } else if (tabId === "trialTab") {
        document.getElementById("trialBtn").classList.add("bg-brand-400/10");
        renderTrialContacts();
    } else if (tabId === "statsTab") {
        document.getElementById("statsBtn").classList.add("bg-brand-400/10");
        renderStats();
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
    const trialContainer = document.getElementById("trialMessages");
    if (!trialContainer) {
        console.error('[ADMIN] Trial container not found in DOM');
        return;
    }

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

// ✅ Poll stats every 5 minutes if on stats tab
setInterval(async () => {
    const statsTab = document.getElementById('statsTab');
    if (statsTab && !statsTab.classList.contains('hidden')) {
        console.log('[ADMIN] Auto-refreshing stats...');
        renderStats(true); // Force refresh
    }
}, 5 * 60 * 1000); // 5 minutes

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

/* ===== STATISTICS ===== */

let statsCache = null; // Cache để không fetch lại khi re-render

function formatVND(num) {
    if (!num) return '0 đ';
    return num.toLocaleString('vi-VN') + ' đ';
}

async function fetchStats() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${API_BASE}/api/admin/stats`, {
            credentials: 'include',
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        console.error('Error fetching stats:', err);
        return null;
    }
}

function buildStatsRow(cells) {
    const tr = document.createElement('tr');
    tr.className = 'border-t border-white/10 hover:bg-white/5';
    cells.forEach((cell, i) => {
        const td = document.createElement('td');
        td.className = i === 0 ? 'p-2 font-semibold' : 'p-2 text-right';
        td.textContent = cell;
        tr.appendChild(td);
    });
    return tr;
}

async function renderStats(forceRefresh = false) {
    if (!statsCache || forceRefresh) {
        statsCache = await fetchStats();
    }
    if (!statsCache) {
        ['statsMonthlyBody', 'statsQuarterlyBody', 'statsYearlyBody', 'statsOverallBody'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-400">Lỗi tải dữ liệu</td></tr>';
        });
        return;
    }

    const { monthly, quarterly, yearly, overall } = statsCache;

    // Bảng 1: Theo tháng
    const monthlyBody = document.getElementById('statsMonthlyBody');
    monthlyBody.innerHTML = '';
    monthly.forEach(r => {
        monthlyBody.appendChild(buildStatsRow([
            r.label,
            formatVND(r.revenue),
            r.newUsers,
            r.newPremium,
            r.newPro
        ]));
    });

    // Bảng 2: Theo quý
    const quarterlyBody = document.getElementById('statsQuarterlyBody');
    quarterlyBody.innerHTML = '';
    quarterly.forEach(r => {
        quarterlyBody.appendChild(buildStatsRow([
            r.label,
            formatVND(r.revenue),
            r.newUsers,
            r.newPremium,
            r.newPro
        ]));
    });

    // Bảng 3: Theo năm
    const yearlyBody = document.getElementById('statsYearlyBody');
    yearlyBody.innerHTML = '';
    yearly.forEach(r => {
        yearlyBody.appendChild(buildStatsRow([
            r.label,
            formatVND(r.revenue),
            r.newUsers,
            r.newPremium,
            r.newPro
        ]));
    });

    // Bảng 4: Tổng quan
    const overallBody = document.getElementById('statsOverallBody');
    overallBody.innerHTML = '';
    const overallTr = document.createElement('tr');
    overallTr.className = 'border-t border-white/10';
    [
        formatVND(overall.totalRevenue),
        overall.totalUsers,
        overall.totalPremiumActive,
        overall.totalProActive
    ].forEach(val => {
        const td = document.createElement('td');
        td.className = 'p-2 text-right font-bold text-brand-400';
        td.textContent = val;
        overallTr.appendChild(td);
    });
    overallBody.appendChild(overallTr);
}

async function exportStatsToExcel() {
    if (!statsCache) {
        statsCache = await fetchStats();
    }
    if (!statsCache) {
        alert('Không thể tải dữ liệu thống kê. Vui lòng thử lại.');
        return;
    }

    const { monthly, quarterly, yearly, overall } = statsCache;
    const wb = XLSX.utils.book_new();

    // Sheet 1: Theo tháng
    const monthlyData = [
        ['Tháng', 'Doanh thu (VNĐ)', 'Users mới', 'License PREMIUM mới', 'License PRO mới'],
        ...monthly.map(r => [r.label, r.revenue, r.newUsers, r.newPremium, r.newPro])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(monthlyData), 'Theo Tháng');

    // Sheet 2: Theo quý
    const quarterlyData = [
        ['Quý', 'Doanh thu (VNĐ)', 'Users mới', 'License PREMIUM mới', 'License PRO mới'],
        ...quarterly.map(r => [r.label, r.revenue, r.newUsers, r.newPremium, r.newPro])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(quarterlyData), 'Theo Quý');

    // Sheet 3: Theo năm
    const yearlyData = [
        ['Năm', 'Doanh thu (VNĐ)', 'Users mới', 'License PREMIUM mới', 'License PRO mới'],
        ...yearly.map(r => [r.label, r.revenue, r.newUsers, r.newPremium, r.newPro])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(yearlyData), 'Theo Năm');

    // Sheet 4: Tổng quan
    const overallData = [
        ['Tổng doanh thu (VNĐ)', 'Tổng Users', 'PREMIUM còn hạn', 'PRO còn hạn'],
        [overall.totalRevenue, overall.totalUsers, overall.totalPremiumActive, overall.totalProActive]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overallData), 'Tổng Quan');

    // Xuất file
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `thong-ke-sentinelvn-${today}.xlsx`);
}