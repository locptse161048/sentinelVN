# PayOS Integration Guide - Sentinel VN

## 📋 Tổng quan

Tích hợp PayOS cho hệ thống thanh toán Sentinel VN với quy trình hoàn chỉnh từ khởi tạo thanh toán đến tạo license.

---

## 🔧 Cấu trúc hệ thống

### Backend APIs

#### 1. **POST `/api/payment/create`**
Khởi tạo thanh toán mới và tạo mã QR
```javascript
// Request
POST /api/payment/create
Authorization: Session
Content-Type: application/json

{
  "plan": "PREMIUM" // hoặc "PRO"
}

// Response
{
  "success": true,
  "paymentId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "checkoutUrl": "https://payos.vn/checkout/...",
  "qrCode": "data:image/png;base64,..."
}
```

#### 2. **POST `/api/payment/return`**
Xác nhận thanh toán và tạo license key
```javascript
// Request
POST /api/payment/return
Authorization: Session
Content-Type: application/json

{
  "paymentId": "64a1b2c3d4e5f6g7h8i9j0k1"
}

// Response (Success)
{
  "success": true,
  "message": "Thanh toán thành công",
  "license": {
    "key": "SNTL-XXXX-XXXX",
    "plan": "PREMIUM",
    "expiresAt": "2026-03-28T14:30:00.000Z"
  }
}
```

#### 3. **GET `/api/payment`**
Lấy lịch sử thanh toán
```javascript
// Response
[
  {
    "_id": "...",
    "clientId": "...",
    "plan": "PREMIUM",
    "amount": 75000,
    "method": "PayOS",
    "status": "success",
    "transactionId": "...",
    "createdAt": "2026-02-26T..."
  }
]
```

#### 4. **GET `/api/payment/license/active`**
Lấy license key hiện tại (chưa hết hạn)
```javascript
// Response
{
  "success": true,
  "license": {
    "key": "SNTL-XXXX-XXXX",
    "plan": "PREMIUM",
    "expiresAt": "2026-03-28T..."
  }
}
```

---

## 💾 Database Schema

### Client
```javascript
{
  _id: ObjectId,
  email: String (unique),
  passwordHash: String,
  name: String,
  role: "client" | "admin",
  status: "đang hoạt động" | "tạm ngưng",
  createdAt: ISODate
}
```

### License
```javascript
{
  _id: ObjectId,
  id: String (unique), // timestamp
  clientId: ObjectId (ref: Client),
  key: String (unique), // e.g., "SNTL-XXXX-XXXX"
  plan: "PREMIUM" | "PRO",
  ammount: Number, // 75000, 500000
  createdAt: ISODate,
  expiresAt: ISODate // +30 days
}
```

### Payment
```javascript
{
  _id: ObjectId,
  clientId: ObjectId (ref: Client),
  plan: "PREMIUM" | "PRO",
  amount: Number,
  method: "PayOS",
  status: "pending" | "success" | "failed",
  transactionId: String (unique),
  createdAt: ISODate
}
```

---

## 🔐 Environment Variables

Thêm vào `.env`:

```env
# PayOS
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key

# Frontend
FRONTEND_URL=https://your-frontend-domain.com

# Session
SESSION_SECRET=your_session_secret

# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# Server
PORT=5000
```

---

## 🌊 Flow Chi Tiết

### 1️⃣ User Click "Mua Premium" (index.html)

```javascript
// Button has class="require-login" data-plan="PREMIUM"
// index.js checks session -> redirects to payment.html?plan=PREMIUM
```

### 2️⃣ Payment Page Init (payment.html)

```javascript
// payment.js initializes:
// - Checks session
// - Gets plan from query param
// - Displays plan & amount in UI
```

### 3️⃣ Create Payment (Tạo Mã QR)

```javascript
// User clicks "Tạo Mã QR Thanh Toán" button
// POST /api/payment/create
// ↓
// Backend:
// 1. Creates Payment record with status="pending"
// 2. Calls PayOS.createPaymentLink()
// 3. Returns checkoutUrl & qrCode
// ↓
// Frontend:
// 1. Displays QR code
// 2. Opens checkoutUrl in new tab
// 3. Polls payment status every 2 seconds
```

### 4️⃣ User Scans & Pays (PayOS)

```
User scans QR → PayOS checkout page
→ Selects payment method
→ Confirms payment
→ PayOS processes & marks as PAID
```

### 5️⃣ Payment Success Callback

```javascript
// PayOS redirects to:
// payment.html?status=success&id=paymentId

// Frontend automatically:
// 1. Calls POST /api/payment/return
// ↓
// Backend:
// 1. Finds Payment record
// 2. Gets payment info from PayOS.getPaymentLinkInformation()
// 3. Verifies status = "PAID"
// 4. Generates license key using genKey()
// 5. Creates License record with +30 days expiry
// 6. Returns license key to frontend
// ↓
// Frontend:
// 1. Displays license key with copy button
// 2. Saves to localStorage
// 3. Shows success message
```

---

## 📌 License Key Generation

### Format

- **PREMIUM**: `SNTL-XXXX-XXXX`
  - Example: `SNTL-A7QM-K2YP`

- **PRO**: `PRO-XXXX-XXXX-XXXX-XXXX`
  - Example: `PRO-A1B2-C3D4-E5F6-G7H8`

### Generation Logic (Node.js)

```javascript
function genKey(plan = 'PREMIUM') {
  function randBlock(len) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let out = "";
    for (let i = 0; i < len; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
  }
  
  if (plan === 'PREMIUM') {
    const part1 = randBlock(4);
    const part2 = randBlock(4);
    return `SNTL-${part1}-${part2}`;
  } else {
    // PRO logic...
  }
}
```

---

## ✅ Testing

### 1. Manual Test Locally

```bash
# Start backend
cd backend
npm install @payos/node
npm start

# Start frontend
cd frontend
python -m http.server 3000
```

### 2. Test Payment Flow

1. Open `http://localhost:3000/index.html`
2. Click "Mua PREMIUM"
3. Login with test account
4. Click "Tạo Mã QR Thanh Toán"
5. Scan QR with phone
6. Use PayOS demo payment method
7. Verify license key appears

### 3. Check Database

```javascript
// Check Payment
db.payments.find({ clientId: ObjectId("...") })

// Check License
db.licenses.find({ clientId: ObjectId("...") })
```

---

## 🐛 Troubleshooting

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-----------|----------|
| PayOS API error | Invalid credentials | Kiểm tra .env variables |
| License not created | Payment status not "PAID" | Poll payment từ PayOS |
| Session error | User not logged in | Check authMiddleware |
| QR not showing | Frontend error | Check browser console |
| Expired license | expiresAt in past | Check date calculation |

---

## 🔄 Error Handling

```javascript
// Frontend catches:
- Network errors
- PayOS API errors
- Session expired

// Backend returns:
- 401: Unauthorized (no session)
- 404: Payment not found
- 500: Server error
- 502: PayOS verification failed (retry suggested)
```

---

## 📱 Integration Checklist

- [x] Models updated (Client, License, Payment)
- [x] Payment routes created
- [x] PayOS SDK installed (@payos/node)
- [x] Environment variables configured
- [x] Frontend payment page created (payment.html)
- [x] Frontend payment logic created (payment.js)
- [x] Auth routes updated
- [x] License key generation implemented
- [x] MongoDB Atlas configured

---

## 🚀 Deployment

1. **Backend (Render/Heroku)**
   - Set environment variables in dashboard
   - Deploy `backend/` folder
   - Verify Node.js 18+ installed

2. **Frontend (Vercel/Netlify)**
   - Deploy `frontend/` folder
   - Update `API_BASE` in JS files if needed
   - Set `FRONTEND_URL` in backend .env

3. **Database**
   - MongoDB Atlas already configured
   - Verify collections created

---

**Last Updated**: 2026-02-26  
**Version**: 1.0.0
