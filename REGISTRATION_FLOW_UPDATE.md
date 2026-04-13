# Cập nhật luồng đăng ký - 4 Bước

## Tổng quan
Luồng đăng ký đã được cập nhật từ 2 bước thành 4 bước riêng biệt, giúp thực hiện tuần tự:
1. **Bước 1**: Thông tin cá nhân
2. **Bước 2**: Xác thực số điện thoại bằng SMS OTP
3. **Bước 3**: Tạo mật khẩu
4. **Bước 4**: Lưu dữ liệu vào MongoDB

---

## Chi tiết các bước

### Bước 1: Thông tin cá nhân
**Yêu cầu nhập:**
- Họ và tên đệm (firstName)
- Tên (lastName)
- Giới tính (gender: nam/nữ/khác)
- Thành phố (city)
- Email

**Xác thực:**
- Đầy đủ thông tin
- Email hợp lệ

**Hành động:** Tiếp tục (Next) → Bước 2

---

### Bước 2: Xác thực số điện thoại
**Yêu cầu nhập:**
- Số điện thoại (10 chữ số)
- Mã OTP (nhận qua SMS từ Firebase)

**Quy trình:**
1. Nhập số điện thoại
2. Click "Gửi mã OTP"
3. Firebase sẽ gửi SMS chứa mã OTP 6 chữ số
4. Nhập mã OTP và xác thực
5. Khi xác thực thành công → Bước 3

**Lưu ý:**
- Sử dụng Firebase Authentication để gửi SMS OTP
- Số điện thoại được lưu định dạng: 10 chữ số (không +84)
- Cờ `phoneVerified` được thiết lập thành `true` khi xác thực thành công

---

### Bước 3: Tạo mật khẩu
**Yêu cầu nhập:**
- Mật khẩu
- Nhập lại mật khẩu

**Yêu cầu mật khẩu:**
- Tối thiểu 8 ký tự
- Ít nhất 1 chữ cái viết hoa (A-Z)
- Ít nhất 1 chữ cái viết thường (a-z)
- Ít nhất 1 chữ số (0-9)

**Xác thực:**
- Hai mật khẩu phải trùng khớp

**Hành động:** 
- Click "Tạo tài khoản" → Bước 4 (gửi dữ liệu)

---

### Bước 4: Hoàn tất
**Hành động:**
- Gửi tất cả dữ liệu đã nhập (Step 1, 2, 3) tới API `/api/auth/register`
- Lưu vào MongoDB Atlas qua model `Client`
- Hiển thị trạng thái loading
- Chuyển hướng sang trang `client.html` khi thành công

---

## Các file đã thay đổi

### 1. Frontend: `frontend/register.html`
**Thay đổi chính:**
- Cập nhật step indicator từ 2 sang 4 bước
- Tách riêng form cho từng bước:
  - Step 1: Form thông tin cá nhân (không có mật khẩu)
  - Step 2: Form xác thực số điện thoại
  - Step 3: Form nhập mật khẩu
  - Step 4: Màn hình loading/hoàn tất
- Thêm CSS animation để hiển thị spinner

### 2. Frontend: `frontend/assets/js/register.js`
**Thay đổi chính:**
- Viết lại toàn bộ logic để hỗ trợ 4 bước
- Thêm hàm `showStep()` để chuyển đổi giữa các bước
- Thêm hàm `updateStepIndicator()` để cập nhật thanh tiến độ
- Step 1: Xác thực thông tin cá nhân
- Step 2: Gửi OTP và xác thực qua Firebase
- Step 3: Xác thực mật khẩu và gửi dữ liệu tới `/api/auth/register`
- Step 4: Hiển thị loading và xử lý kết quả
- Thêm nút "Quay lại" cho Step 2 và Step 3
- Xử lý phone number: `result.user.phoneNumber.replace(/\D/g, '').slice(-10)` → 10 chữ số

### 3. Backend: `backend/routes/auth.routes.js`
**Thay đổi chính:**
- Cập nhật endpoint `POST /api/auth/register` để nhận các field mới:
  - `firstName` (tên đệm)
  - `lastName` (tên)
  - `city` (thành phó)
  - `phoneVerified` (cờ xác thực)
- Lưu tất cả dữ liệu vào MongoDB model `Client`
- Thêm validation cho `city` và các field mới
- Emit socket event `new_client_registered` với thông tin đầy đủ

### 4. Frontend: `frontend/assets/css/style.css`
**Thay đổi chính:**
- Thêm `@keyframes spin` animation để hiển thị spinner loading

---

## Dữ liệu lưu vào MongoDB (Client model)

Khi đăng ký hoàn tất, các field sau được lưu:

```javascript
{
  email: String (unique),
  passwordHash: String,
  fullName: String,
  firstName: String,
  lastName: String,
  gender: String (nam/nữ/khác),
  city: String,
  phone: String (10 chữ số),
  address: String (nếu có),
  phoneVerified: Boolean (true nếu xác thực thành công),
  role: String (mặc định: 'client'),
  status: String (mặc định: 'đang hoạt động'),
  createdAt: Date,
  // ... các field khác
}
```

---

## API Endpoint

### POST `/api/auth/register`

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "String",
  "fullName": "First Last Name",
  "firstName": "First",
  "lastName": "Last",
  "gender": "nam",
  "city": "Ho Chi Minh",
  "phone": "0123456789",
  "phoneVerified": true
}
```

**Response:**
```json
{
  "message": "Đăng ký thành công",
  "user": {
    "_id": "...",
    "email": "user@example.com",
    "fullName": "First Last Name",
    "firstName": "First",
    "lastName": "Last",
    "phone": "0123456789",
    "city": "Ho Chi Minh"
  }
}
```

---

## Quy trình kiểm tra (Testing Steps)

1. **Truy cập** trang đăng ký: `register.html`

2. **Step 1** - Điền thông tin:
   - Họ và tên đệm: "Nguyễn Văn"
   - Tên: "A"
   - Giới tính: "Nam"
   - Thành phố: "Hà Nội"
   - Email: "test@example.com"
   - Click "Tiếp tục"

3. **Step 2** - Xác thực số điện thoại:
   - Nhập số điện thoại: "0987654321"
   - Click "Gửi mã OTP"
   - Chờ nhận SMS
   - Nhập mã OTP
   - Click "Xác thực OTP"

4. **Step 3** - Tạo mật khẩu:
   - Nhập mật khẩu: "Password123"
   - Nhập lại: "Password123"
   - Click "Tạo tài khoản"

5. **Step 4** - Hoàn tất:
   - Chờ loading
   - Chuyển hướng sang `client.html`
   - Kiểm tra MongoDB Atlas để xác nhận dữ liệu

---

## Các lưu ý bảo mật (Security)

- ✅ Mật khẩu được hash bằng bcryptjs trước khi lưu
- ✅ Xác thực email format
- ✅ Xác thực mật khẩu strength
- ✅ Xác thực số điện thoại qua Firebase OTP
- ✅ Kiểm tra email tồn tại
- ✅ Rate limiting cho đăng ký
- ✅ Không log sensitive information

---

## Trạng thái hiện tại

✅ **Hoàn tất** - Luồng đã được cập nhật và sẵn sàng kiểm tra
