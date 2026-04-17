/* ===== CONFIG ===== */
const API_BASE = "https://sentinelvn.onrender.com";

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
  
  return originalFetch.apply(this, [resource, config]);
};

// ⚠️ SECURITY: Helper function để escape HTML entities (prevent XSS)
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/* ===== CHECK SESSION FROM BACKEND ===== */
async function checkSession() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`${API_BASE}/api/auth/session`, {
      credentials: "include",
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (!res.ok) {
      console.error('[SESSION] ❌ Session check failed');
      window.location.href = 'index.html';
      return null;
    }
    
    const session = await res.json();
    console.log('[SESSION] ✅ Session valid:', session.email);
    return session;
  } catch (err) {
    console.error('[SESSION] Error:', err.message);
    window.location.href = 'index.html';
    return null;
  }
}

/* ===== LOAD USER INFO ===== */
async function loadUserInfo() {
  try {
    const res = await fetch(`${API_BASE}/api/client/me`);
    
    if (!res.ok) {
      console.error('[USER] Failed to load info');
      return null;
    }
    
    const user = await res.json();
    
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) {
      userEmailEl.textContent = escapeHtml(user.email);
    }
    
    return user;
  } catch (err) {
    console.error('[USER] Error loading info:', err.message);
    return null;
  }
}

/* ===== LOAD LICENSES ===== */
async function loadLicenses() {
  try {
    const loadingEl = document.getElementById('licensesLoading');
    const errorEl = document.getElementById('licensesError');
    const tableEl = document.getElementById('licensesTable');
    const tbodyEl = document.getElementById('licensesTableBody');
    
    const res = await fetch(`${API_BASE}/api/team/licenses`);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (!data.success || !data.data) {
      throw new Error('Invalid response format');
    }
    
    loadingEl.style.display = 'none';
    
    if (data.data.length === 0) {
      errorEl.textContent = '📭 Chưa có giấy phép nào';
      errorEl.style.display = 'block';
      return;
    }
    
    tbodyEl.innerHTML = '';
    data.data.forEach(license => {
      const row = document.createElement('tr');
      const createdDate = new Date(license.createdAt).toLocaleDateString('vi-VN');
      const expiresDate = new Date(license.expiresAt).toLocaleDateString('vi-VN');
      
      const statusClass = license.status === 'active' ? 'active' : 
                          license.status === 'expired' ? 'expired' : 'inactive';
      const statusText = license.status === 'active' ? '✅ Hoạt động' :
                         license.status === 'expired' ? '⏰ Hết hạn' : '❌ Tạm ngưng';
      
      row.innerHTML = `
        <td><code>${escapeHtml(license.key)}</code></td>
        <td>${escapeHtml(license.plan)}</td>
        <td>${escapeHtml(license.maxMembers.toString())}</td>
        <td><span class="status ${statusClass}">${statusText}</span></td>
        <td>${createdDate}</td>
        <td>${expiresDate}</td>
      `;
      tbodyEl.appendChild(row);
    });
    
    tableEl.style.display = 'table';
  } catch (err) {
    console.error('[LICENSES] Error:', err.message);
    document.getElementById('licensesLoading').style.display = 'none';
    document.getElementById('licensesError').textContent = `❌ Lỗi: ${err.message}`;
    document.getElementById('licensesError').style.display = 'block';
  }
}

/* ===== LOAD TEAM MEMBERS ===== */
async function loadMembers() {
  try {
    const loadingEl = document.getElementById('membersLoading');
    const errorEl = document.getElementById('membersError');
    const tableEl = document.getElementById('membersTable');
    const tbodyEl = document.getElementById('membersTableBody');
    
    const res = await fetch(`${API_BASE}/api/team/members`);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (!data.success || !data.data) {
      throw new Error('Invalid response format');
    }
    
    loadingEl.style.display = 'none';
    
    if (data.data.length === 0) {
      errorEl.textContent = '📭 Chưa có thành viên nào';
      errorEl.style.display = 'block';
      return;
    }
    
    tbodyEl.innerHTML = '';
    data.data.forEach(member => {
      const row = document.createElement('tr');
      const statusClass = member.status === 'đang hoạt động' ? 'active' : 'inactive';
      const statusText = member.status === 'đang hoạt động' ? '✅ Hoạt động' : '❌ Tạm ngưng';
      
      row.innerHTML = `
        <td>${escapeHtml(member.email)}</td>
        <td>${escapeHtml(member.firstName)}</td>
        <td>${escapeHtml(member.lastName)}</td>
        <td>${escapeHtml(member.gender)}</td>
        <td>${escapeHtml(member.dateOfBirth)}</td>
        <td>${escapeHtml(member.phone)}</td>
        <td><span class="status ${statusClass}">${statusText}</span></td>
        <td>
          <button class="action-btn view" onclick="viewMember('${member._id}')">Xem</button>
          <button class="action-btn delete" onclick="removeMember('${member._id}')">Xóa</button>
        </td>
      `;
      tbodyEl.appendChild(row);
    });
    
    tableEl.style.display = 'table';
  } catch (err) {
    console.error('[MEMBERS] Error:', err.message);
    document.getElementById('membersLoading').style.display = 'none';
    document.getElementById('membersError').textContent = `❌ Lỗi: ${err.message}`;
    document.getElementById('membersError').style.display = 'block';
  }
}

/* ===== LOAD AUDIT LOGS ===== */
async function loadAuditLogs() {
  try {
    const loadingEl = document.getElementById('auditLoading');
    const errorEl = document.getElementById('auditError');
    const tableEl = document.getElementById('auditTable');
    const tbodyEl = document.getElementById('auditTableBody');
    
    const res = await fetch(`${API_BASE}/api/team/audit-logs`);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (!data.success || !data.data) {
      throw new Error('Invalid response format');
    }
    
    loadingEl.style.display = 'none';
    
    if (data.data.length === 0) {
      errorEl.textContent = '📭 Chưa có hoạt động nào';
      errorEl.style.display = 'block';
      return;
    }
    
    tbodyEl.innerHTML = '';
    data.data.forEach(log => {
      const row = document.createElement('tr');
      const actionText = log.action === 'upload' ? '📤 Upload' :
                         log.action === 'download' ? '📥 Download' :
                         log.action === 'view' ? '👁️ Xem' :
                         log.action === 'delete' ? '🗑️ Xóa' :
                         log.action === 'share' ? '🔗 Chia sẻ' : log.action;
      
      row.innerHTML = `
        <td>${escapeHtml(log.time)}</td>
        <td>${escapeHtml(log.email)}</td>
        <td>${escapeHtml(log.file)}</td>
        <td>${actionText}</td>
      `;
      tbodyEl.appendChild(row);
    });
    
    tableEl.style.display = 'table';
  } catch (err) {
    console.error('[AUDIT] Error:', err.message);
    document.getElementById('auditLoading').style.display = 'none';
    document.getElementById('auditError').textContent = `❌ Lỗi: ${err.message}`;
    document.getElementById('auditError').style.display = 'block';
  }
}

/* ===== LOAD PAYMENTS ===== */
async function loadPayments() {
  try {
    const loadingEl = document.getElementById('paymentsLoading');
    const errorEl = document.getElementById('paymentsError');
    const tableEl = document.getElementById('paymentsTable');
    const tbodyEl = document.getElementById('paymentsTableBody');
    
    const res = await fetch(`${API_BASE}/api/team/payments`);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (!data.success || !data.data) {
      throw new Error('Invalid response format');
    }
    
    loadingEl.style.display = 'none';
    
    if (data.data.length === 0) {
      errorEl.textContent = '📭 Chưa có thanh toán nào';
      errorEl.style.display = 'block';
      return;
    }
    
    tbodyEl.innerHTML = '';
    data.data.forEach(payment => {
      const row = document.createElement('tr');
      const statusClass = payment.status === 'success' ? 'active' :
                          payment.status === 'pending' ? 'pending' : 'inactive';
      const statusText = payment.status === 'success' ? '✅ Thành công' :
                         payment.status === 'pending' ? '⏳ Chờ xử lý' : '❌ Thất bại';
      
      const amountText = payment.amount.toLocaleString('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      
      row.innerHTML = `
        <td>${escapeHtml(payment.plan)}</td>
        <td>${amountText} đ</td>
        <td>${escapeHtml(payment.method)}</td>
        <td><span class="status ${statusClass}">${statusText}</span></td>
        <td><code>${escapeHtml(payment.orderCode)}</code></td>
        <td><code>${escapeHtml(payment.transactionId)}</code></td>
        <td>${escapeHtml(payment.createdAt)}</td>
      `;
      tbodyEl.appendChild(row);
    });
    
    tableEl.style.display = 'table';
  } catch (err) {
    console.error('[PAYMENTS] Error:', err.message);
    document.getElementById('paymentsLoading').style.display = 'none';
    document.getElementById('paymentsError').textContent = `❌ Lỗi: ${err.message}`;
    document.getElementById('paymentsError').style.display = 'block';
  }
}

/* ===== REMOVE TEAM MEMBER ===== */
async function removeMember(memberId) {
  if (!confirm('Bạn có chắc muốn xóa thành viên này khỏi đội nhóm?')) {
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/api/team/members/${memberId}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (data.success) {
      alert('✅ Xóa thành viên thành công');
      loadMembers(); // Reload the members list
    } else {
      alert(`❌ ${data.message}`);
    }
  } catch (err) {
    console.error('[REMOVE MEMBER] Error:', err.message);
    alert(`❌ Lỗi: ${err.message}`);
  }
}

/* ===== VIEW MEMBER DETAILS ===== */
function viewMember(memberId) {
  alert('Xem chi tiết thành viên: ' + memberId);
  // This can be implemented with a modal in the future
}

/* ===== TAB SWITCH ===== */
function showTab(n) {
  document.querySelectorAll('[id^="tab"]').forEach(el => {
    if (el.id.match(/^tab\d+$/)) {
      el.classList.remove('active');
    }
  });
  
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const tabEl = document.getElementById('tab' + n);
  if (tabEl) {
    tabEl.classList.add('active');
  }
  
  document.querySelectorAll('.tab-button')[n - 1]?.classList.add('active');
}

/* ===== LOGOUT ===== */
async function logout() {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST"
  });
  
  localStorage.removeItem('auth_token');
  window.location.href = "index.html";
}

/* ===== INIT PAGE ===== */
(async () => {
  try {
    // Check session
    const session = await checkSession();
    if (!session) {
      return;
    }
    
    // Check if user is team leader
    if (session.role !== 'teamLeader') {
      console.warn('[TEAM] User is not a team leader. Redirecting...');
      if (session.role === 'admin') {
        window.location.href = 'admin.html';
      } else if (session.role === 'supervisor') {
        window.location.href = 'supervisor.html';
      } else {
        window.location.href = 'client.html';
      }
      return;
    }
    
    // Load user info
    await loadUserInfo();
    
    // Load all data for tab 1
    await loadLicenses();
    await loadMembers();
    
    console.log('[TEAM] ✅ Page initialized successfully');
  } catch (err) {
    console.error('[TEAM] Init error:', err.message);
    alert('❌ Lỗi khởi tạo trang: ' + err.message);
  }
})();

// Load audit logs and payments when tabs are switched
document.addEventListener('DOMContentLoaded', () => {
  // Override tab switch to load data on demand
  const originalShowTab = window.showTab;
  window.showTab = function(n) {
    originalShowTab(n);
    
    if (n === 2 && !document.getElementById('auditTable').style.display || document.getElementById('auditTable').style.display === '') {
      loadAuditLogs();
    } else if (n === 3 && !document.getElementById('paymentsTable').style.display || document.getElementById('paymentsTable').style.display === '') {
      loadPayments();
    }
  };
});
