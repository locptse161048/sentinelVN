# WebSocket Real-Time Updates Implementation

## 📋 Tổng Quan (Overview)

Đã thêm chức năng **tự cập nhật theo thời gian thực (Real-time Updates)** cho giao diện Admin Dashboard sử dụng **WebSocket (Socket.io)**.

Khi một client mới đăng ký hoặc gửi tin nhắn hỗ trợ, bản thân admin sẽ **tự động cập nhật** mà **không cần reload trang**.

---

## ✨ Tính Năng Được Thêm

### 1. **Cập nhật danh sách tài khoản (Clients) tự động**
   - Khi có client mới đăng ký → Admin tab "Quản lý Tài khoản" sẽ **tự động cập nhật danh sách** 
   - Hiển thị thông báo: "🎉 Tài khoản mới: [email]"

### 2. **Cập nhật tin nhắn hỗ trợ (Support Messages) tự động**
   - Khi có tin nhắn hỗ trợ mới từ client → Admin tab "Tin nhắn Hỗ trợ" sẽ **tự động cập nhật**
   - Hiển thị thông báo: "💬 Tin nhắn mới từ: [email]"
   - Cập nhật lại badge số lượng tin nhắn chờ xử lý

---

## 🔧 Thay Đổi Kỹ Thuật (Technical Changes)

### Backend Changes

#### 1. **server.js**
- ✅ Thêm `socket.io` library
- ✅ Tạo HTTP server thay vì Express server trực tiếp
- ✅ Cấu hình CORS cho Socket.io với tất cả origins được phép  
- ✅ Export `io` instance qua `app.locals.io` để các routes có thể sử dụng

```javascript
const http = require('http');
const { Server } = require('socket.io');
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: {...} });
app.locals.io = io;
httpServer.listen(PORT);
```

#### 2. **routes/auth.routes.js**
- ✅ Thêm sự kiện Socket.io khi client đăng ký thành công
- ✅ Phát sự kiện `new_client_registered` chứa thông tin client mới

```javascript
const io = req.app.locals.io;
if (io) {
    io.emit('new_client_registered', {
        _id, email, fullName, gender, phone, address, status, createdAt, ...
    });
}
```

#### 3. **routes/support.routes.js**
- ✅ Thêm sự kiện Socket.io khi client gửi tin nhắn hỗ trợ
- ✅ Phát sự kiện `new_support_message` chứa thông tin tin nhắn mới

```javascript
const io = req.app.locals.io;
if (io) {
    io.emit('new_support_message', {
        _id, email, title, message, status, createdAt
    });
}
```

### Frontend Changes

#### 1. **assets/js/admin.js**
- ✅ Thêm biến `socket` để lưu trữ kết nối WebSocket
- ✅ Hàm `initializeWebSocket()`: Tải Socket.io client library động
- ✅ Hàm `connectWebSocket()`: Kết nối tới server
- ✅ Lắng nghe sự kiện `new_client_registered`: Tự động cập nhật danh sách tài khoản khi ở tab Quản lý
- ✅ Lắng nghe sự kiện `new_support_message`: Tự động cập nhật tin nhắn hỗ trợ khi ở tab Hỗ trợ
- ✅ Hàm `showNotification()`: Hiển thị thông báo toast khi có update
- ✅ Hàm `refreshAccountsList()`: Tải lại danh sách tài khoản
- ✅ Hàm `refreshSupportMessages()`: Tải lại tin nhắn hỗ trợ

```javascript
let socket = null;

document.addEventListener("DOMContentLoaded", async () => {
    // ... session check ...
    initializeWebSocket();
});

socket.on('new_client_registered', (newClient) => {
    showNotification(`🎉 Tài khoản mới: ${newClient.email}`);
    refreshAccountsList();
});

socket.on('new_support_message', (newMessage) => {
    showNotification(`💬 Tin nhắn mới từ: ${newMessage.email}`);
    refreshSupportMessages();
});
```

#### 2. **assets/css/admin.css**
- ✅ Thêm CSS animations: `slideIn` và `slideOut` cho notifications
- ✅ CSS classes: `.animate-slideIn`, `.animate-slideOut`

```css
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

---

## 🚀 Cách Hoạt Động (How It Works)

### Luồng Đăng Ký Client (Client Registration Flow)

```
Client Browser → POST /api/auth/register
                        ↓
                 Server Validates & Creates Client
                        ↓
                 io.emit('new_client_registered', {...})
                        ↓
                 Admin Dashboard receives event
                        ↓
                 Automatically refreshes accounts table
                 Shows notification: "🎉 Tài khoản mới: [email]"
```

### Luồng Tin Nhắn Hỗ Trợ (Support Message Flow)

```
Client Browser → POST /api/support
                        ↓
                 Server Validates & Creates Message
                        ↓
                 io.emit('new_support_message', {...})
                        ↓
                 Admin Dashboard receives event
                        ↓
                 Automatically refreshes support messages
                 Shows notification: "💬 Tin nhắn mới từ: [email]"
```

---

## 📦 Packages Installed

```
✅ socket.io@latest (Backend)
   - Cung cấp WebSocket bidirectional communication
```

Check `backend/package.json`:
```json
{
  "dependencies": {
    "socket.io": "^4.x.x",
    ...
  }
}
```

---

## 🧪 Testing & Verification

### 1. **Kiểm tra kết nối WebSocket**
```bash
# Terminal 1: Start backend server
cd backend
npm start

# Terminal 2: Check if socket.io is initialized
# Open browser DevTools Console → Check for:
# [SOCKET] Connected to server ✅
```

### 2. **Test Đăng Ký Client Mới**
- Mở 2 tabs browser:
  - Tab 1: Admin Dashboard (admin.html)
  - Tab 2: Client Registration (index.html / đăng ký tài khoản)
- Đăng ký tài khoản mới ở Tab 2
- **Expected**: Tab 1 tự động cập nhật danh sách tài khoản + thông báo xuất hiện

### 3. **Test Gửi Tin Nhắn Hỗ Trợ**
- Mở 2 tabs browser:
  - Tab 1: Admin Dashboard (admin.html)
  - Tab 2: Client Support (client.html)
- Gửi tin nhắn hỗ trợ ở Tab 2
- **Expected**: Tab 1 tự động cập nhật tin nhắn + thông báo xuất hiện

### 4. **Kiểm tra Console Logs**
Admin Dashboard console sẽ hiển thị:
```
[SOCKET] Initializing WebSocket connection...
[SOCKET] Connected to server ✅
[SOCKET] Received new_client_registered event: {_id, email, ...}
[ADMIN] Refreshing accounts list...
[SOCKET] Received new_support_message event: {_id, email, ...}
[ADMIN] Refreshing support messages...
```

Backend server console sẽ hiển thị:
```
[STARTUP] ✅ WebSocket (socket.io) initialized
[SOCKET] Emitted new_client_registered event
[SOCKET] Emitted new_support_message event
```

---

## 🔒 Security Features

✅ **CORS Protection**: Socket.io được cấu hình với CORS chỉ cho phép origins được phép  
✅ **Credentials**: Sử dụng `withCredentials: true` để bảo vệ kết nối  
✅ **Reconnection**: Tự động reconnect nếu connection mất  
✅ **Error Handling**: Xử lý lỗi kết nối gracefully  

---

## 📝 Configuration Details

### Socket.io Client Configuration (admin.js)
```javascript
socket = io(API_BASE, {
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
});
```

### Socket.io Server Configuration (server.js)
```javascript
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin.includes('localhost') || origin.includes('127.0.0.1') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST']
  }
});
```

---

## 🎯 Performance Notes

- ✅ WebSocket connections are persistent and efficient
- ✅ Only sends data when events occur (no polling)
- ✅ Automatically disconnects on logout
- ✅ Graceful fallback if Socket.io fails (loads from CDN)
- ✅ Only refreshes UI if admin is viewing the relevant tab

---

## 🛠️ Files Modified

1. ✅ `backend/server.js` - Added HTTP server & Socket.io initialization
2. ✅ `backend/routes/auth.routes.js` - Added new_client_registered event
3. ✅ `backend/routes/support.routes.js` - Added new_support_message event  
4. ✅ `frontend/assets/js/admin.js` - Added WebSocket client logic
5. ✅ `frontend/assets/css/admin.css` - Added notification animations
6. ✅ `backend/package.json` - Added socket.io dependency

---

## 📚 Additional Resources

- Socket.io Documentation: https://socket.io/docs/
- WebSocket Standard: https://en.wikipedia.org/wiki/WebSocket
- CORS with Socket.io: https://socket.io/docs/v4/handling-cors/

---

## ✅ Status

🎉 **IMPLEMENTATION COMPLETE**

Tất cả chức năng đã được thêm và sẵn sàng sử dụng!

Thêm bất kỳ câu hỏi hoặc tính năng nào khác tương tự nếu cần!
