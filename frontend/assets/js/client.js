/* ===== CHECK SESSION ===== */

const API_BASE = 'https://sentinelvn.onrender.com';
const session = JSON.parse(localStorage.getItem("sentinel_session"));
if (!session || session.role !== "client") {
  window.location.href = "index.html";
}

async function fetchClientInfo() {
  const res = await fetch(`${API_BASE}/client/me`, {
    headers: { 'Authorization': `Bearer ${session.token}` }
  });
  if (!res.ok) {
    localStorage.removeItem("sentinel_session");
    window.location.href = "index.html";
    return null;
  }
  return await res.json();
}

(async () => {
  const user = await fetchClientInfo();
  if (!user) return;
  if (user.status === "tạm ngưng") {
    alert("Tài khoản của bạn hiện đã bị tạm ngưng");
    localStorage.removeItem("sentinel_session");
    location.href = "index.html";
    return;
  }
  document.getElementById("accEmail").textContent = user.email;
  document.getElementById("subInfo").textContent = user.plan ? `Gói: ${user.plan}` : "Bạn đang sử dụng gói FREE.";
})();

/* ===== LOAD DATA ===== */
document.getElementById("accEmail").textContent = session.email;

document.getElementById("subInfo").textContent =
  session.subscription || "Bạn đang sử dụng gói FREE.";

const historyList = document.getElementById("historyList");
async function renderPaymentHistory() {
  if (!historyList) return;
  historyList.innerHTML = "<li>Đang tải...</li>";
  const res = await fetch(`${API_BASE}/client/payments`, {
    headers: { 'Authorization': `Bearer ${session.token}` }
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
renderPaymentHistory();
/* ===== LOAD SENT MESSAGES ===== */
const sentMessagesList = document.getElementById("sentMessagesList");

async function renderSentMessages() {
  if (!sentMessagesList) return;
  sentMessagesList.innerHTML = "<li>Đang tải...</li>";
  const res = await fetch(`${API_BASE}/client/support`, {
    headers: { 'Authorization': `Bearer ${session.token}` }
  });
  if (!res.ok) {
    sentMessagesList.innerHTML = "<li>Không thể tải yêu cầu hỗ trợ.</li>";
    return;
  }
  const myMessages = await res.json();
  if (myMessages.length) {
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
  } else {
    sentMessagesList.innerHTML = "<li>Bạn chưa gửi yêu cầu nào.</li>";
  }
}
renderSentMessages();



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
function logout() {
  localStorage.removeItem("sentinel_session");
  window.location.href = "index.html";
}

/* ===== SUPPORT FORM ===== */
const supportForm = document.getElementById("supportForm");


if (supportForm) {
  supportForm.addEventListener("submit", async e => {
    e.preventDefault();
    const session = JSON.parse(localStorage.getItem("sentinel_session"));
    if (!session) return;
    const subject = supportForm.querySelector("input").value.trim();
    const message = supportForm.querySelector("textarea").value.trim();
    if (!subject || !message) return;
    // Kiểm tra số lượng ticket đang xử lý
    const resCount = await fetch(`${API_BASE}/client/support`, {
      headers: { 'Authorization': `Bearer ${session.token}` }
    });
    const myMessages = resCount.ok ? await resCount.json() : [];
    const processingCount = myMessages.filter(m => m.status !== "resolved").length;
    if (processingCount >= 3) {
      document.getElementById("supportMsg").textContent =
        "❌ Bạn đã có 3 yêu cầu đang xử lý. Vui lòng chờ phản hồi trước khi gửi thêm.";
      return;
    }
    // Gửi yêu cầu mới
    const res = await fetch(`${API_BASE}/support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}`
      },
      body: JSON.stringify({ subject, message })
    });
    if (!res.ok) {
      document.getElementById("supportMsg").textContent = "❌ Gửi yêu cầu thất bại.";
      return;
    }
    document.getElementById("supportMsg").textContent = "✅ Yêu cầu đã được gửi thành công.";
    supportForm.reset();
    renderSentMessages();
  });
}

