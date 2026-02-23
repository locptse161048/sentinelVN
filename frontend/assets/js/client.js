/* ===== CONFIG ===== */
const API_BASE = "https://sentinelvn.onrender.com";

/* ===== CHECK SESSION FROM BACKEND ===== */
async function checkSession() {
  try {
    let res = await fetch(`${API_BASE}/api/auth/session`, {
      credentials: "include"
    });
    // Nếu fail, đợi 500ms rồi thử lại
    if (!res.ok) {
      await new Promise(r => setTimeout(r, 500));

      res = await fetch(`${API_BASE}/api/auth/session`, {
        credentials: "include"
      });

      if (!res.ok) {
        window.location.href = "index.html";
        return null;
      }
    }

    return await res.json();
  } catch (err) {
    window.location.href = "index.html";
    return null;
  }
}


/* ===== LOAD USER INFO ===== */
async function loadClientInfo() {
  const res = await fetch(`${API_BASE}/api/client/me`, {
    credentials: "include"
  });

  if (!res.ok) {
    window.location.href = "index.html";
    return null;
  }

  const user = await res.json();

  if (user.status === "tạm ngưng") {
    alert("Tài khoản của bạn hiện đã bị tạm ngưng");
    await logout();
    return null;
  }

  document.getElementById("accEmail").textContent = user.email;
  document.getElementById("subInfo").textContent =
    user.plan ? `Gói: ${user.plan}` : "Bạn đang sử dụng gói FREE.";

  return user;
}

/* ===== PAYMENT HISTORY ===== */
async function renderPaymentHistory() {
  const historyList = document.getElementById("historyList");
  if (!historyList) return;

  historyList.innerHTML = "<li>Đang tải...</li>";

  const res = await fetch(`${API_BASE}/api/client/payments`, {
    credentials: "include"
  });

  if (!res.ok) {
    historyList.innerHTML = "<li>Không thể tải lịch sử giao dịch.</li>";
    return;
  }

  const payments = await res.json();

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
}

/* ===== SENT SUPPORT MESSAGES ===== */
async function renderSentMessages() {
  const sentMessagesList = document.getElementById("sentMessagesList");
  if (!sentMessagesList) return;

  sentMessagesList.innerHTML = "<li>Đang tải...</li>";

  const res = await fetch(`${API_BASE}/api/client/support`, {
    credentials: "include"
  });

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
}

/* ===== SUPPORT FORM ===== */
const supportForm = document.getElementById("supportForm");

if (supportForm) {
  supportForm.addEventListener("submit", async e => {
    e.preventDefault();
    await loadClientInfo();
    const subject = supportForm.querySelector("input").value.trim();
    const message = supportForm.querySelector("textarea").value.trim();
    if (!subject || !message) return;

    // Kiểm tra số ticket đang xử lý
    const resCount = await fetch(`${API_BASE}/api/client/support`, {
      credentials: "include"
    });

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
  });
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
  const session = await checkSession();
  if (!session) return;
  // Nếu là admin thì chuyển sang admin.html
  if (session.role === "admin") {
    window.location.href = "admin.html";
    return;
  }
  // Nếu là client thì load dashboard
  await loadClientInfo();
  await renderPaymentHistory();
  await renderSentMessages();
})();