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
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ===== CHECK SESSION FROM BACKEND ===== */
async function checkSession() {
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      // 🔑 Get token from localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.log('[CLIENT] No token in localStorage');
        return null;
      }
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      // ✅ Token will be auto-added by fetch monkey-patch
      const res = await fetch(`${API_BASE}/api/auth/session`, {
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (res.ok) {
        const user = await res.json();
        console.log('[CLIENT] Session verified:', user.email);
        return user;
      }

      retries++;
      if (retries < maxRetries) {
        await new Promise(r => setTimeout(r, 300 * Math.pow(2, retries - 1)));
      }
    } catch (err) {
      retries++;
      if (retries < maxRetries) {
        await new Promise(r => setTimeout(r, 300 * Math.pow(2, retries - 1)));
      }
    }
  }

  window.location.href = "index.html";
  return null;
}


/* ===== LOAD USER INFO ===== */
async function loadClientInfo() {
  let retries = 0;
  const maxRetries = 2;

  while (retries < maxRetries) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${API_BASE}/api/client/me`, {
        credentials: "include",
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) {
        retries++;
        if (retries >= maxRetries) {
          window.location.href = "index.html";
          return null;
        }
        await new Promise(r => setTimeout(r, 300 * Math.pow(2, retries - 1)));
        continue;
      }

      const user = await res.json();

      if (user.status === "tạm ngưng") {
        alert("Tài khoản của bạn hiện đã bị tạm ngưng");
        await logout();
        return null;
      }

      const accNameEl = document.getElementById("accName");
      const accEmailEl = document.getElementById("accEmail");
      const accFirstNameEl = document.getElementById("accFirstName");
      const accLastNameEl = document.getElementById("accLastName");
      const accGenderEl = document.getElementById("accGender");
      const accDateOfBirthEl = document.getElementById("accDateOfBirth");
      const accPhoneEl = document.getElementById("accPhone");
      const accCityEl = document.getElementById("accCity");

      if (accNameEl && accEmailEl) {
        accNameEl.textContent = user.fullName || "Chưa cập nhật";
        accEmailEl.textContent = user.email;
        accFirstNameEl.textContent = user.firstName || "Chưa cập nhật";
        accLastNameEl.textContent = user.lastName || "Chưa cập nhật";
        accGenderEl.textContent = user.gender ? (user.gender === 'nam' ? 'Nam' : user.gender === 'nữ' ? 'Nữ' : 'Khác') : "Chưa cập nhật";
        
        // Convert dateOfBirth to dd/mm/yyyy format
        if (user.dateOfBirth) {
          const date = new Date(user.dateOfBirth);
          const dd = String(date.getDate()).padStart(2, '0');
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const yyyy = date.getFullYear();
          accDateOfBirthEl.textContent = `${dd}/${mm}/${yyyy}`;
        } else {
          accDateOfBirthEl.textContent = "Chưa cập nhật";
        }
        
        accPhoneEl.textContent = user.phone || "Chưa cập nhật";
        accCityEl.textContent = user.city || "Chưa cập nhật";
      }

      return user;
    } catch (err) {
      retries++;
      if (retries >= maxRetries) {
        window.location.href = "index.html";
        return null;
      }
      await new Promise(r => setTimeout(r, 300 * Math.pow(2, retries - 1)));
    }
  }
}

/* ===== PAYMENT HISTORY ===== */
async function renderPaymentHistory() {
  const paymentTableBody = document.getElementById("paymentTableBody");
  if (!paymentTableBody) {
    return;
  }

  paymentTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4">Đang tải...</td></tr>`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_BASE}/api/client/payments`, {
      credentials: "include",
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      paymentTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-white/60">Không thể tải lịch sử giao dịch.</td></tr>`;
      return;
    }

    const payments = await res.json();

    if (!payments.length) {
      paymentTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-white/60">Chưa có giao dịch nào.</td></tr>`;
      return;
    }

    paymentTableBody.innerHTML = "";

    payments.reverse().forEach(item => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-white/10 hover:bg-white/5";

      const amountText = `${item.amount?.toLocaleString('vi-VN') || 'N/A'}đ`;
      const createdDate = new Date(item.createdAt).toLocaleString('vi-VN');

      // ⚠️ SECURITY: Create TD elements safely with textContent
      const createTd = (content, extraClass = '') => {
        const td = document.createElement('td');
        td.className = `py-2 px-2 ${extraClass}`;
        td.textContent = content;
        return td;
      };

      tr.appendChild(createTd(amountText));
      tr.appendChild(createTd(item.plan || 'N/A'));
      tr.appendChild(createTd(item.method || 'N/A'));
      tr.appendChild(createTd(item.orderCode || 'N/A', 'font-mono text-xs'));

      const tdTransaction = document.createElement('td');
      tdTransaction.className = 'py-2 px-2 font-mono text-xs max-w-xs truncate';
      tdTransaction.title = item.transactionId || 'N/A';
      tdTransaction.textContent = item.transactionId || 'N/A';
      tr.appendChild(tdTransaction);

      tr.appendChild(createTd(createdDate));

      paymentTableBody.appendChild(tr);
    });
  } catch (err) {
    paymentTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-white/60">Không thể tải lịch sử giao dịch.</td></tr>`;
  }
}

/* ===== SENT SUPPORT MESSAGES ===== */
async function renderSentMessages() {
  const sentMessagesList = document.getElementById("sentMessagesList");
  if (!sentMessagesList) {
    console.log("[CLIENT] ℹ️  sentMessagesList element not found (tab 5)");
    return;
  }

  sentMessagesList.innerHTML = "<li>Đang tải...</li>";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_BASE}/api/client/support`, {
      credentials: "include",
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      sentMessagesList.innerHTML = "<li>Không thể tải yêu cầu hỗ trợ.</li>";
      return;
    }

    const myMessages = await res.json();

    if (!myMessages.length) {
      sentMessagesList.innerHTML = "<li>Bạn chưa gửi yêu cầu nào.</li>";
      return;
    }

    sentMessagesList.innerHTML = "";

    [...myMessages].reverse().forEach(msg => {
      const li = document.createElement("li");
      li.className = "border-b border-white/10 pb-3";

      const statusText =
        msg.status === "resolved"
          ? '<span class="text-green-400">Đã phản hồi</span>'
          : '<span class="text-yellow-400">Đang xử lý</span>';

      // ⚠️ SECURITY: Create elements safely with textContent
      const headerDiv = document.createElement('div');
      headerDiv.className = 'flex justify-between items-center';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'text-brand-400 font-semibold';
      titleDiv.textContent = msg.title;

      const statusDiv = document.createElement('div');
      statusDiv.className = 'text-xs';
      statusDiv.innerHTML = statusText; // Safe: statusText is hardcoded literal

      headerDiv.appendChild(titleDiv);
      headerDiv.appendChild(statusDiv);

      const dateDiv = document.createElement('div');
      dateDiv.className = 'text-white/60 text-xs mb-1';
      dateDiv.textContent = new Date(msg.createdAt).toLocaleString();

      const messageDiv = document.createElement('div');
      messageDiv.textContent = msg.message; // Safe: use textContent for user data

      li.appendChild(headerDiv);
      li.appendChild(dateDiv);
      li.appendChild(messageDiv);

      sentMessagesList.appendChild(li);
    });
  } catch (err) {
    sentMessagesList.innerHTML = "<li>Không thể tải yêu cầu hỗ trợ.</li>";
  }
}

/* ===== SUPPORT FORM ===== */
const supportForm = document.getElementById("supportForm");

if (supportForm) {
  supportForm.addEventListener("submit", async e => {
    e.preventDefault();

    try {
      await loadClientInfo();
      const subject = supportForm.querySelector("input").value.trim();
      const message = supportForm.querySelector("textarea").value.trim();
      if (!subject || !message) return;

      // Kiểm tra số ticket đang xử lý
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const resCount = await fetch(`${API_BASE}/api/client/support`, {
        credentials: "include",
        signal: controller.signal
      });

      clearTimeout(timeout);

      const myMessages = resCount.ok ? await resCount.json() : [];
      const processingCount = myMessages.filter(m => m.status !== "resolved").length;

      if (processingCount >= 3) {
        document.getElementById("supportMsg").textContent =
          "❌ Bạn đã có 3 yêu cầu đang xử lý. Vui lòng chờ phản hồi trước khi gửi thêm.";
        return;
      }

      // Gửi yêu cầu mới
      const res = await fetch(`${API_BASE}/api/client/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: subject, message })
      });

      if (!res.ok) {
        document.getElementById("supportMsg").textContent =
          "❌ Gửi yêu cầu thất bại.";
        return;
      }

      document.getElementById("supportMsg").textContent =
        "✅ Yêu cầu đã được gửi thành công.";

      supportForm.reset();
      renderSentMessages();
    } catch (err) {
      document.getElementById("supportMsg").textContent =
        "❌ Có lỗi xảy ra. Vui lòng thử lại.";
    }
  });
}

/* ===== RENDER LICENSE TABLE ===== */
async function renderLicenseTable() {
  const licenseTableBody = document.getElementById("licenseTableBody");
  if (!licenseTableBody) {
    console.log("[CLIENT] ℹ️  licenseTableBody element not found (tab 2)");
    return;
  }

  licenseTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4">Đang tải...</td></tr>`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_BASE}/api/payment/licenses`, {
      credentials: "include",
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      licenseTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-white/60">Không thể tải license.</td></tr>`;
      return;
    }

    const data = await res.json();
    const licenses = data.licenses || [];

    if (!licenses.length) {
      licenseTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-white/60">Bạn đang sử dụng gói FREE</td></tr>`;
      return;
    }

    licenseTableBody.innerHTML = "";

    licenses.forEach(lic => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-white/10 hover:bg-white/5";

      const createdDate = new Date(lic.createdAt).toLocaleDateString('vi-VN');
      const expiresDate = new Date(lic.expiresAt).toLocaleDateString('vi-VN');
      const statusText = lic.status === 'active'
        ? '<span style="color:#86efac">🟢 Hoạt động</span>'
        : '<span style="color:#fca5a5">🔴 Hết hạn</span>';
      const amountText = `${lic.amount?.toLocaleString('vi-VN') || 'N/A'}đ`;

      tr.innerHTML = `
        <td class="py-2 px-2 text-white/90 font-mono text-xs">${lic.key}</td>
        <td class="py-2 px-2">${lic.plan}</td>
        <td class="py-2 px-2">${amountText}</td>
        <td class="py-2 px-2">${statusText}</td>
        <td class="py-2 px-2 text-white/70">${createdDate}</td>
        <td class="py-2 px-2 text-white/70">${expiresDate}</td>
      `;

      licenseTableBody.appendChild(tr);
    });
  } catch (err) {
    licenseTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-white/60">Không thể tải license.</td></tr>`;
  }
}

/* ===== TAB SWITCH ===== */
function showTab(n) {
  document.querySelectorAll("[id^='content']").forEach(c =>
    c.classList.add("hidden")
  );
  document.querySelectorAll("[id^='tab']").forEach(t =>
    t.classList.remove("active-tab")
  );

  document.getElementById("content" + n).classList.remove("hidden");
  document.getElementById("tab" + n).classList.add("active-tab");
}

/* ===== LOGOUT ===== */
async function logout() {
  // Token will be auto-added by fetch monkey-patch
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST"
  });

  localStorage.removeItem('auth_token');
  window.location.href = "index.html";
}

/* ===== INIT PAGE ===== */
(async () => {
  try {
    const session = await checkSession();
    if (!session) {
      return;
    }

    if (session.role === "admin") {
      window.location.href = "admin.html";
      return;
    }

    await loadClientInfo();
    await renderPaymentHistory();
    await renderLicenseTable();
    await renderSentMessages();

    const params = new URLSearchParams(window.location.search);
    const tabFromQuery = params.get('tab');
    if (tabFromQuery) {
      showTab(Number(tabFromQuery));
    }

    const subjectFromQuery = params.get('subject');
    if (subjectFromQuery) {
      const subjectInput = document.querySelector('#supportForm input');
      if (subjectInput) subjectInput.value = subjectFromQuery;
    }
  } catch (err) {
    // Silent error handling
  }
})();
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