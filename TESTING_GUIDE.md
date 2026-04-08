# Hướng Dẫn Test Real-Time Updates

## 🚀 Bước 1: Khởi Động Backend

```bash
cd backend
npm start
```

Bạn sẽ thấy output:
```
[STARTUP] ✅ WebSocket (socket.io) initialized
Server running on port 5000
```

---

## 🧪 Bước 2: Test Tự Động Cập Nhật Tài Khoản

### Cách 1: Sử dụng 2 Browser Tabs

1. **Tab 1**: Mở Admin Dashboard
   ```
   https://sentinelvn.onrender.com/admin.html
   (hoặc http://localhost:5500/admin.html nếu dev local)
   ```
   - Đăng nhập với tài khoản admin
   - Chuyển đến tab "Quản lý Tài khoản"
   - Mở DevTools Console để xem logs

2. **Tab 2**: Mở trang đăng ký client
   ```
   https://sentinelvn.onrender.com/index.html
   (hoặc http://localhost:5500/index.html nếu dev local)
   ```

3. **Thực hiện**: Đăng ký tài khoản mới
   - Nhập Email: `test@example.com`
   - Nhập Mật khẩu: `TestPassword123`
   - Nhập Họ Tên: `Test User`
   - Nhập SĐT: `0912345678`
   - Nhập Địa chỉ: `Vietnam`
   - Chọn Giới tính: `Nam`
   - Click "Đăng ký"

4. **Kiểm tra Tab 1 (Admin)**:
   - ✅ Danh sách tài khoản tự động cập nhật
   - ✅ Xuất hiện dòng mới với email `test@example.com`
   - ✅ Thông báo hiện lên: "🎉 Tài khoản mới: test@example.com"
   - ✅ DevTools Console hiện:
     ```
     [SOCKET] Received new_client_registered event: {...}
     [ADMIN] Refreshing accounts list...
     ```

---

## 🧪 Bước 3: Test Tự Động Cập Nhật Tin Nhắn Hỗ Trợ

### Cách 1: Sử dụng 2 Browser Tabs

1. **Tab 1**: Mở Admin Dashboard (như trên)
   - Chuyển đến tab "Tin nhắn Hỗ trợ"
   - Mở DevTools Console

2. **Tab 2**: Mở trang client (client.html)
   ```
   https://sentinelvn.onrender.com/client.html
   (hoặc http://localhost:5500/client.html nếu dev local)
   ```
   - Đăng nhập với tài khoản client (dùng email từ Bước 2)
   - Từ (hoặc dùng: `test@example.com` / `TestPassword123` nếu vừa tạo)

3. **Thực hiện**: Gửi tin nhắn hỗ trợ
   - Tìm phần "Tin Nhắn Hỗ trợ" hoặc "Support Message"
   - Nhập Tiêu đề: `Cần hỗ trợ tính năng XYZ`
   - Nhập Nội dung: `Anh/chị chỉ em cách sử dụng...`
   - Click "Gửi"

4. **Kiểm tra Tab 1 (Admin)**:
   - ✅ Danh sách tin nhắn hỗ trợ tự động cập nhật
   - ✅ Xuất hiện tin nhắn mới từ client
   - ✅ Thông báo hiện lên: "💬 Tin nhắn mới từ: test@example.com"
   - ✅ Badge số lượng tin nhắn chờ xử lý tăng lên
   - ✅ DevTools Console hiện:
     ```
     [SOCKET] Received new_support_message event: {...}
     [ADMIN] Refreshing support messages...
     ```

---

## 📊 Kiểm Tra Chi Tiết (Detailed Check)

### Backend Console Logs

Mở terminal chạy backend và kiểm tra:

```bash
# Khi có client đăng ký:
[SOCKET] Emitted new_client_registered event

# Khi có tin nhắn hỗ trợ:
[SOCKET] Emitted new_support_message event
```

### Admin Dashboard Console Logs

Mở DevTools Console (F12) của Admin Dashboard tab và kiểm tra:

```javascript
// Khi kết nối:
[SOCKET] Initializing WebSocket connection...
[SOCKET] Connected to server ✅

// Khi có client đăng ký:
[SOCKET] Received new_client_registered event: Object {
  _id: "...",
  email: "test@example.com",
  fullName: "Test User",
  gender: "Nam",
  phone: "0912345678",
  address: "Vietnam",
  status: "đang hoạt động",
  createdAt: "2024-04-08T...",
  licenseStatus: "pending",
  licenseKey: "-",
  plan: "-"
}
[ADMIN] Refreshing accounts list...

// Khi có tin nhắn hỗ trợ:
[SOCKET] Received new_support_message event: Object {
  _id: "...",
  email: "test@example.com",
  title: "Cần hỗ trợ tính năng XYZ",
  message: "Anh/chị chỉ em cách sử dụng...",
  status: "pending",
  createdAt: "2024-04-08T..."
}
[ADMIN] Refreshing support messages...
```

---

## ✅ Checklist Kiểm Tra

- [ ] Backend server đã start thành công
- [ ] Admin Dashboard kết nối WebSocket thành công
- [ ] Khi client đăng ký, danh sách tài khoản tự động cập nhật trong 1-2 giây
- [ ] Thông báo "🎉 Tài khoản mới" hiện lên và biến mất sau 3 giây
- [ ] Khi client gửi tin nhắn, danh sách cải nhân hỗ trợ tự động cập nhật
- [ ] Thông báo "💬 Tin nhắn mới" hiện lên và biến mất sau 3 giây
- [ ] Badge số lượng tin nhắn chờ xử lý cập nhật chính xác
- [ ] Console logs xuất hiện đúng vị trí (backend & frontend)
- [ ] Khi reload trang admin, vẫn reconnect WebSocket thành công
- [ ] Khi logout, WebSocket disconnect

---

## 🐛 Troubleshooting

### Vấn đề: Admin Dashboard không nhận được real-time updates

**Kiểm tra:**
1. Backend server có start không? → Check terminal chạy `npm start`
2. Admin tab có kết nối WebSocket? → Check DevTools Console có `[SOCKET] Connected` không?
3. Client công ty dev từ cùng origin không? → Check CORS config

**Giải pháp:**
```javascript
// browser DevTools Console
// Kiểm tra socket state
io  // nếu undefined nghĩa là socket.io chưa load
socket.connected  // nếu false nghĩa là chưa kết nối
```

### Vấn đề: Thông báo không hiện

**Kiểm tra:** CSS animations có load không?
```javascript
// DevTools Console
document.styleSheets // kiểm tra admin.css có trong đó không
```

### Vấn đề: Event không phát từ backend

**Kiểm tra:** 
1. Socket.io có init không? → `app.locals.io` có tồn tại không?
2. Backend logs có hiện `[SOCKET] Emitted` không?

---

## 🎯 Expected Behavior

### Scenario 1: Đăng Ký Client Mới

```
Time: 0s   → Client submit register form
Time: 0.5s → Backend validates & creates client
Time: 0.6s → Backend emits 'new_client_registered' event
Time: 0.7s → Admin Dashboard receives event
Time: 0.8s → Table refreshes with new client row
Time: 0.8s → Toast notification appears
Time: 3.8s → Toast notification disappears
```

### Scenario 2: Gửi Support Message

```
Time: 0s   → Client submit support form
Time: 0.5s → Backend validates & creates message
Time: 0.6s → Backend emits 'new_support_message' event
Time: 0.7s → Admin Dashboard receives event
Time: 0.8s → Support messages list refreshes
Time: 0.8s → Toast notification appears
Time: 0.8s → Badge count updates
Time: 3.8s → Toast notification disappears
```

---

## 📱 Testing on Different Devices

### Local Testing (Same Machine)

```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend (Live Server / Vite)
cd frontend && npm run dev
# hoặc
# Open admin.html with Live Server on http://localhost:5500
```

### Cross-Machine Testing

1. Note down backend IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   ```
   IPv4 Address: 192.168.x.x
   ```

2. Update API_BASE in admin.js:
   ```javascript
   const API_BASE = 'http://192.168.x.x:5000';
   ```

3. Ensure backend CORS allows the IP:
   ```javascript
   // Already configured in server.js to allow all localhost variants
   ```

---

## 🎓 How It Works (Technical Flow)

```
Client Browser
    ↓
    └─→ POST /api/auth/register {email, password, ...}
        ↓
        Server (Node.js + Express)
        ├─→ Validate input
        ├─→ Hash password with bcryptjs
        ├─→ Create Client document in MongoDB
        ├─→ Get io instance from app.locals
        ├─→ **io.emit('new_client_registered', {...})**  ← Socket Event!
        └─→ Return response

                    ↓ WebSocket Event

        Admin Dashboard (Browser + Socket.io Client)
        ├─→ socket.on('new_client_registered', callback)
        ├─→ showNotification('🎉 Tài khoản mới: email')
        ├─→ refreshAccountsList()
        │   ├─→ fetch('/api/admin/clients')
        │   └─→ renderAccounts()
        └─→ Update DOM with new client row
```

---

## 📞 Support

Nếu có bất kỳ vấn đề nào, kiểm tra:
1. Browser DevTools Console (F12)
2. Backend Server Terminal
3. Network tab trong DevTools (tìm WebSocket connection)

Happy Testing! 🚀
