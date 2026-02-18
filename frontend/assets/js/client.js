/* ===== CHECK SESSION ===== */
const session = JSON.parse(localStorage.getItem("sentinel_session"));
const users = JSON.parse(localStorage.getItem("sentinel_users") || "{}");

if (!session || session.role !== "client") {
  window.location.href = "index.html";
}

if (!session || !users[session.email]) {
  location.href = "index.html";
}

if (users[session.email].status === "suspended") {
  alert("Tài khoản của bạn hiện đã bị tạm ngưng");
  localStorage.removeItem("sentinel_session");
  location.href = "index.html";
}

/* ===== LOAD DATA ===== */
document.getElementById("accEmail").textContent = session.email;

document.getElementById("subInfo").textContent =
  session.subscription || "Bạn đang sử dụng gói FREE.";

const historyList = document.getElementById("historyList");

if (session.history && session.history.length) {
  session.history.forEach(item => {
    const li = document.createElement("li");
    li.className = "border-b border-white/10 pb-2";
    li.textContent = item;
    historyList.appendChild(li);
  });
} else {
  historyList.innerHTML = "<li>Chưa có giao dịch nào.</li>";
}
/* ===== LOAD SENT MESSAGES ===== */
const sentMessagesList = document.getElementById("sentMessagesList");

function renderSentMessages() {
  if (!sentMessagesList) return;

  sentMessagesList.innerHTML = "";

  const messages = JSON.parse(
    localStorage.getItem("support_messages") || "[]"
  );

  const myMessages = messages.filter(
    msg => msg.email === session.email
  );

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

        <div class="text-white/60 text-xs mb-1">
          ${new Date(msg.createdAt).toLocaleString()}
        </div>

        <div>${msg.message}</div>
      `;

      sentMessagesList.appendChild(li);
    });

  } else {
    sentMessagesList.innerHTML =
      "<li>Bạn chưa gửi yêu cầu nào.</li>";
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
  supportForm.addEventListener("submit", e => {
    e.preventDefault();

    const session = JSON.parse(localStorage.getItem("sentinel_session"));
    if (!session) return;

    const subject = supportForm.querySelector("input").value.trim();
    const message = supportForm.querySelector("textarea").value.trim();

    if (!subject || !message) return;

    const messages = JSON.parse(
      localStorage.getItem("support_messages") || "[]"
    );

    // 🔴 ĐẾM SỐ TICKET ĐANG PROCESSING CỦA EMAIL NÀY
    const processingCount = messages.filter(
      msg =>
        msg.email === session.email &&
        msg.status !== "resolved"
    ).length;

    if (processingCount >= 3) {
      document.getElementById("supportMsg").textContent =
        "❌ Bạn đã có 3 yêu cầu đang xử lý. Vui lòng chờ phản hồi trước khi gửi thêm.";
      return;
    }

    // ✅ Nếu < 3 thì cho gửi
    messages.push({
      id: Date.now(),
      email: session.email,
      subject,
      message,
      createdAt: new Date().toISOString(),
      status: "processing"
    });

    localStorage.setItem("support_messages", JSON.stringify(messages));

    document.getElementById("supportMsg").textContent =
      "✅ Yêu cầu đã được gửi thành công.";

    supportForm.reset();

    renderSentMessages();
  });
}

