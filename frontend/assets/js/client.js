/* ===== CONFIG ===== */
const API_BASE = "https://sentinelvn.onrender.com";

// 🔴 Global error handler - capture all logs
const allLogs = [];
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
  originalLog.apply(console, args);
  allLogs.push('[LOG] ' + args.join(' '));
};

console.error = function(...args) {
  originalError.apply(console, args);
  allLogs.push('[ERROR] ' + args.join(' '));
};

console.warn = function(...args) {
  originalWarn.apply(console, args);
  allLogs.push('[WARN] ' + args.join(' '));
};

window.onerror = function(msg, url, lineNo, columnNo, error) {
  const errorMsg = "[WINDOW ERROR] " + msg + " at " + url + ":" + lineNo + ":" + columnNo;
  originalError(errorMsg);
  allLogs.push(errorMsg);
  return false;
};

window.onunhandledrejection = function(event) {
  const errorMsg = "[UNHANDLED REJECTION] " + event.reason;
  originalError(errorMsg);
  allLogs.push(errorMsg);
};

// Tự động mở tab nếu có query ?tab=N
const tabFromQuery = new URLSearchParams(window.location.search).get('tab');
if (tabFromQuery) showTab(Number(tabFromQuery));

/* ===== CHECK SESSION FROM BACKEND ===== */
async function checkSession() {
  let retries = 0;
  const maxRetries = 3;

  console.log("[CLIENT] 🔍 checkSession() started");

  while (retries < maxRetries) {
    try {
      console.log(`[CLIENT] 📡 Attempt ${retries + 1}/${maxRetries} - Fetching session...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const res = await fetch(`${API_BASE}/api/auth/session`, {
        credentials: "include",
        signal: controller.signal
      });

      clearTimeout(timeout);
      console.log(`[CLIENT] Response status: ${res.status}`);

      if (res.ok) {
        const user = await res.json();
        console.log("[CLIENT] ✅ Session valid. User:", user);
        return user;
      }

      console.warn(`[CLIENT] ⚠️  Response not OK: ${res.status}`);
      retries++;
      if (retries < maxRetries) {
        // Exponential backoff: 300ms, 600ms, 1000ms
        await new Promise(r => setTimeout(r, 300 * Math.pow(2, retries - 1)));
      }
    } catch (err) {
      console.warn(`[CLIENT] ❌ Session check attempt ${retries + 1} failed:`, err.message);
      retries++;
      if (retries < maxRetries) {
        await new Promise(r => setTimeout(r, 300 * Math.pow(2, retries - 1)));
      }
    }
  }

  console.error("[CLIENT] ❌❌❌ Session check failed after 3 attempts. Redirecting to index.html");
  window.location.href = "index.html";
  return null;
}


/* ===== LOAD USER INFO ===== */
async function loadClientInfo() {
  let retries = 0;
  const maxRetries = 2;
  
  console.log("[CLIENT] 👤 loadClientInfo() started");
  
  while (retries < maxRetries) {
    try {
      console.log(`[CLIENT] 📡 Fetching /api/client/me (attempt ${retries + 1}/${maxRetries})...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${API_BASE}/api/client/me`, {
        credentials: "include",
        signal: controller.signal
      });
      clearTimeout(timeout);
      console.log(`[CLIENT] Response status: ${res.status}`);
      
      if (!res.ok) {
        console.warn(`[CLIENT] ⚠️  /api/client/me returned ${res.status}`);
        retries++;
        if (retries >= maxRetries) {
          console.error("[CLIENT] ❌ Failed to load client info - Max retries reached");
          window.location.href = "index.html";
          return null;
        }
        await new Promise(r => setTimeout(r, 300 * Math.pow(2, retries - 1)));
        continue;
      }
      
      const user = await res.json();
      console.log("[CLIENT] ✅ User loaded:", user);
      
      if (user.status === "tạm ngưng") {
        alert("Tài khoản của bạn hiện đã bị tạm ngưng");
        await logout();
        return null;
      }
      
      document.getElementById("accName").textContent = user.fullName || "Chưa cập nhật";
      document.getElementById("accEmail").textContent = user.email;
      document.getElementById("subInfo").textContent =
        user.plan ? `Gói: ${user.plan}` : "Bạn đang sử dụng gói FREE.";

      return user;
    } catch (err) {
      console.warn(`[CLIENT] ❌ Load client info attempt ${retries + 1} failed:`, err.message, err);
      retries++;
      if (retries >= maxRetries) {
        console.error("[CLIENT] ❌❌❌ Failed to load client info after retries");
        window.location.href = "index.html";
        return null;
      }
      await new Promise(r => setTimeout(r, 300 * Math.pow(2, retries - 1)));
    }
  }
}

/* ===== PAYMENT HISTORY ===== */
async function renderPaymentHistory() {
  const historyList = document.getElementById("historyList");
  if (!historyList) {
    console.log("[CLIENT] ℹ️  historyList element not found (tab 3)");
    return;
  }

  console.log("[CLIENT] 💳 renderPaymentHistory() started");
  historyList.innerHTML = "<li>Đang tải...</li>";

  try {
    console.log("[CLIENT] 📡 Fetching /api/client/payments...");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_BASE}/api/client/payments`, {
      credentials: "include",
      signal: controller.signal
    });

    clearTimeout(timeout);
    console.log(`[CLIENT] Payment history response status: ${res.status}`);

    if (!res.ok) {
      console.warn(`[CLIENT] ❌ Payment history fetch failed: ${res.status}`);
      historyList.innerHTML = "<li>Không thể tải lịch sử giao dịch.</li>";
      return;
    }

    const payments = await res.json();
    console.log(`[CLIENT] ✅ Loaded ${payments.length} payments`);

    if (!payments.length) {
      historyList.innerHTML = "<li>Chưa có giao dịch nào.</li>";
      return;
    }

    historyList.innerHTML = "";

    payments.reverse().forEach(item => {
      const li = document.createElement("li");
      li.className = "border-b border-white/10 pb-2";
      li.textContent = `${item.plan} - ${item.amount}đ - ${item.status} - ${new Date(item.createdAt).toLocaleString()}`;
      historyList.appendChild(li);
    });
  } catch (err) {
    console.error("[CLIENT] ❌ Error loading payment history:", err.message, err);
    historyList.innerHTML = "<li>Không thể tải lịch sử giao dịch.</li>";
  }
}

/* ===== SENT SUPPORT MESSAGES ===== */
async function renderSentMessages() {
  const sentMessagesList = document.getElementById("sentMessagesList");
  if (!sentMessagesList) {
    console.log("[CLIENT] ℹ️  sentMessagesList element not found (tab 5)");
    return;
  }

  console.log("[CLIENT] 📨 renderSentMessages() started");
  sentMessagesList.innerHTML = "<li>Đang tải...</li>";

  try {
    console.log("[CLIENT] 📡 Fetching /api/client/support...");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_BASE}/api/client/support`, {
      credentials: "include",
      signal: controller.signal
    });

    clearTimeout(timeout);
    console.log(`[CLIENT] Support messages response status: ${res.status}`);

    if (!res.ok) {
      console.warn(`[CLIENT] ❌ Support messages fetch failed: ${res.status}`);
      sentMessagesList.innerHTML = "<li>Không thể tải yêu cầu hỗ trợ.</li>";
      return;
    }

    const myMessages = await res.json();
    console.log(`[CLIENT] ✅ Loaded ${myMessages.length} support messages`);

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

      li.innerHTML = `
        <div class="flex justify-between items-center">
          <div class="text-brand-400 font-semibold">${msg.subject}</div>
          <div class="text-xs">${statusText}</div>
        </div>
        <div class="text-white/60 text-xs mb-1">${new Date(msg.createdAt).toLocaleString()}</div>
        <div>${msg.message}</div>
      `;

      sentMessagesList.appendChild(li);
    });
  } catch (err) {
    console.error("[CLIENT] ❌ Error loading support messages:", err.message, err);
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
      const res = await fetch(`${API_BASE}/api/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject, message })
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
      console.error("Support form error:", err);
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

  console.log("[CLIENT] 🖤 renderLicenseTable() started");
  licenseTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4">Đang tải...</td></tr>`;

  try {
    console.log("[CLIENT] 📡 Fetching /api/payment/licenses...");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_BASE}/api/payment/licenses`, {
      credentials: "include",
      signal: controller.signal
    });

    clearTimeout(timeout);
    console.log(`[CLIENT] License table response status: ${res.status}`);

    if (!res.ok) {
      console.warn(`[CLIENT] ❌ License fetch failed: ${res.status}`);
      licenseTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-white/60">Không thể tải license.</td></tr>`;
      return;
    }

    const data = await res.json();
    const licenses = data.licenses || [];
    console.log(`[CLIENT] ✅ Loaded ${licenses.length} licenses`);

    if (!licenses.length) {
      licenseTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-white/60">Chưa có license nào. Hãy mua PREMIUM để bắt đầu.</td></tr>`;
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
    console.error("[CLIENT] ❌ Error loading license table:", err.message, err);
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
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include"
  });

  window.location.href = "index.html";
}

/* ===== INIT PAGE ===== */
(async () => {
  console.log("[CLIENT] 🚀 INIT PAGE started");
  
  try {
    const session = await checkSession();
    if (!session) {
      const msg = "[CLIENT] ❌❌❌ Session check returned null. Exiting.";
      console.error(msg);
      showErrorModal([], "❌ Session Authentication Failed");
      return;
    }
    
    console.log("[CLIENT] ✅ Session valid. Role:", session.role);
    
    // Nếu là admin thì chuyển sang admin.html
    if (session.role === "admin") {
      console.log("[CLIENT] 👨‍💼 Admin detected. Redirecting to admin.html");
      window.location.href = "admin.html";
      return;
    }
    
    // Nếu là client thì load dashboard
    console.log("[CLIENT] 📊 Loading client dashboard...");
    
    await loadClientInfo();
    console.log("[CLIENT] ✅ loadClientInfo() completed");
    
    await renderPaymentHistory();
    console.log("[CLIENT] ✅ renderPaymentHistory() completed");
    
    await renderLicenseTable();
    console.log("[CLIENT] ✅ renderLicenseTable() completed");
    
    await renderSentMessages();
    console.log("[CLIENT] ✅ renderSentMessages() completed");
    
    const params = new URLSearchParams(window.location.search);
    const tabFromQuery = params.get('tab');
    if (tabFromQuery) {
      console.log("[CLIENT] 📑 Opening tab " + tabFromQuery);
      showTab(Number(tabFromQuery));
    }

    // ✅ Thêm — tự điền subject nếu có query ?subject=...
    const subjectFromQuery = params.get('subject');
    if (subjectFromQuery) {
      console.log("[CLIENT] 📝 Pre-filling subject: " + subjectFromQuery);
      const subjectInput = document.querySelector('#supportForm input');
      if (subjectInput) subjectInput.value = subjectFromQuery;
    }
    
    console.log("[CLIENT] ✅✅✅ INIT PAGE completed successfully");
  } catch (err) {
    const msg = "[CLIENT] ❌ CRITICAL ERROR: " + err.message;
    console.error(msg, err);
    console.error("Stack trace:", err.stack);
    // Delay a bit to ensure logs are captured
    setTimeout(() => {
      showErrorModal([], "❌ Critical Error During Page Load");
    }, 500);
  }
})();

/* ===== Show error modal to catch logs ===== */
function showErrorModal(errorLogs, title) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: #1a1a1a;
    border: 2px solid #ff6b6b;
    border-radius: 8px;
    padding: 30px;
    max-width: 700px;
    max-height: 80vh;
    overflow-y: auto;
    color: white;
    font-family: monospace;
    font-size: 13px;
  `;
  
  const titleEl = document.createElement('h2');
  titleEl.style.cssText = 'color: #ff6b6b; margin-top: 0; margin-bottom: 20px; font-size: 18px;';
  titleEl.textContent = '⚠️ ' + title;
  
  const logContent = document.createElement('div');
  logContent.style.cssText = `
    background: #000;
    border: 1px solid #666;
    padding: 15px;
    border-radius: 4px;
    max-height: 450px;
    overflow-y: auto;
    margin-bottom: 20px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  `;
  
  // Combine errorLogs + allLogs
  const combinedLogs = [...errorLogs, ...allLogs];
  
  combinedLogs.forEach(log => {
    const line = document.createElement('div');
    line.textContent = log;
    if (log.includes('ERROR') || log.includes('❌')) {
      line.style.color = '#ff6b6b';
    } else if (log.includes('✅') || log.includes('completed')) {
      line.style.color = '#51cf66';
    } else if (log.includes('[CLIENT]')) {
      line.style.color = '#a6e3a1';
    } else {
      line.style.color = '#aaa';
    }
    logContent.appendChild(line);
  });
  
  const instructions = document.createElement('p');
  instructions.style.cssText = 'color: #ffd93d; margin: 15px 0; font-size: 12px;';
  instructions.innerHTML = '💡 Tip: Copy these logs and share with developer<br>🔍 Look for [ERROR] or ❌ marks';
  
  const buttons = document.createElement('div');
  buttons.style.cssText = 'display: flex; gap: 10px; margin-top: 20px;';
  
  const continueBtn = document.createElement('button');
  continueBtn.textContent = '← Go Back to Home';
  continueBtn.style.cssText = `
    flex: 1;
    padding: 12px 20px;
    background: #4c6ef5;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: bold;
  `;
  continueBtn.onmouseover = () => continueBtn.style.background = '#364fc7';
  continueBtn.onmouseout = () => continueBtn.style.background = '#4c6ef5';
  continueBtn.onclick = () => {
    window.location.href = 'index.html';
  };
  
  const copyBtn = document.createElement('button');
  copyBtn.textContent = '📋 Copy All Logs';
  copyBtn.style.cssText = `
    flex: 1;
    padding: 12px 20px;
    background: #51cf66;
    color: black;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: bold;
  `;
  copyBtn.onmouseover = () => copyBtn.style.background = '#40c057';
  copyBtn.onmouseout = () => copyBtn.style.background = '#51cf66';
  copyBtn.onclick = () => {
    const allLogsText = combinedLogs.join('\n');
    navigator.clipboard.writeText(allLogsText).then(() => {
      copyBtn.textContent = '✅ Copied to Clipboard!';
      setTimeout(() => {
        copyBtn.textContent = '📋 Copy All Logs';
      }, 2000);
    }).catch(err => {
      console.error("Copy failed:", err);
      alert("Failed to copy. Please manually select and copy the logs above.");
    });
  };
  
  buttons.appendChild(copyBtn);
  buttons.appendChild(continueBtn);
  
  content.appendChild(titleEl);
  content.appendChild(instructions);
  content.appendChild(logContent);
  content.appendChild(buttons);
  modal.appendChild(content);
  document.body.appendChild(modal);
}