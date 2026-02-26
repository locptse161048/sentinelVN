# 🚀 PayOS Integration - Setup & Testing Guide

## 📌 Quick Start

### Điều kiện tiên quyết
- ✅ Node.js 18+ 
- ✅ MongoDB Atlas account
- ✅ PayOS account (Sandbox/Production)
- ✅ @payos/node đã cài đặt

---

## 1️⃣ Setup Backend

```bash
# Vào thư mục backend
cd backend

# Cài đặt dependencies
npm install

# Kiểm tra @payos/node
npm list @payos/node
# Output: backend@1.0.0 └── @payos/node@x.x.x
```

### Cấu hình .env

```env
# MongoDB
MONGO_URI=mongodb+srv://SentinelVN:gvfG8sGYpa7gJxwx@cluster0.ek1emhs.mongodb.net/sentinelVN

# PayOS (from PayOS dashboard)
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key

# Frontend
FRONTEND_URL=https://sentinelvn-one.vercel.app  # or http://localhost:3000

# Session
SESSION_SECRET=your_random_secret_key_here

# Server
PORT=5000
```

### Chạy Backend

```bash
npm start
# Output: Server running on port 5000
```

---

## 2️⃣ Setup Frontend (Local Testing)

```bash
# Cập nhật API_BASE trong các JS files
# frontend/assets/js/index.js
# frontend/assets/js/payment.js

const API_BASE = 'http://localhost:5000';  // Local testing
// hoặc
const API_BASE = 'https://sentinelvn.onrender.com';  // Production
```

### Chạy Frontend

```bash
# Option 1: Python simple server
cd frontend
python -m http.server 3000
# Access: http://localhost:3000

# Option 2: Node live-server
npm install -g live-server
cd frontend
live-server --port=3000

# Option 3: VS Code Live Server
# Right-click index.html → Open with Live Server
```

---

## 3️⃣ Test Payment Flow (Step by Step)

### ✅ Test 1: Session Check
```
1. Open http://localhost:3000/index.html
2. Should see "Đăng nhập" button
3. Check browser console: No errors
```

### ✅ Test 2: Authentication
```
1. Click "Đăng nhập" button
2. Sign up with: test@example.com / password123
3. Should see "Đăng xuất" button
4. Session cookie saved in browser
```

### ✅ Test 3: Navigate to Payment
```
1. Click "Mua PREMIUM" button (Pricing section)
2. Should redirect to payment.html?plan=PREMIUM
3. Should show: PREMIUM | 75.000đ
```

### ✅ Test 4: Create Payment
```
1. Click "📱 Tạo Mã QR Thanh Toán"
2. Should show spinner (30 seconds)
3. QR code should appear
4. checkoutUrl should open in new tab
```

### ✅ Test 5: Verify Payment (Sandbox)
```
1. In PayOS checkout page, use sandbox payment
2. Complete payment flow
3. Return to payment.html
4. Should show success message
5. License key should appear (e.g., SNTL-A7QM-K2YP)
```

### ✅ Test 6: Database Check
```
# MongoDB Atlas shell
// Check Payment record
db.payments.findOne({ status: "success" })

// Check License record
db.licenses.findOne({ key: /SNTL/ })

// Verify relationship
db.clients.findById(ObjectId(...))
```

---

## 4️⃣ API Testing (Postman/cURL)

### Test Create Payment
```bash
# Step 1: Login first to get session
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Step 2: Create payment
curl -X POST http://localhost:5000/api/payment/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"plan":"PREMIUM"}'
```

### Expected Response
```json
{
  "success": true,
  "paymentId": "507f1f77bcf86cd799439011",
  "checkoutUrl": "https://payos.vn/checkout/...",
  "qrCode": "data:image/png;base64,..."
}
```

---

## 5️⃣ Debugging

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `Cannot find module '@payos/node'` | Package not installed | `npm install @payos/node --save` |
| `PayOS API error 401` | Invalid credentials | Check `.env` PAYOS_* variables |
| `Session is null` | User not authenticated | Login first before payment |
| `QR not showing` | Frontend error | Check browser console for JS errors |
| `License not created` | Payment status not "PAID" | Wait for PayOS to confirm |
| `CORS error` | Frontend domain not allowed | Check backend CORS config |

### Enable Debug Logging

```javascript
// In payment.routes.js
console.log('PayOS Response:', createdPayment);
console.log('Payment ID:', payment._id);
console.log('License Key:', licenseKey);

// In payment.js
console.log('Create payment response:', data);
console.log('Payment status:', payments);
```

---

## 6️⃣ Production Deployment

### Backend (Render/Railway)

```bash
# 1. Push code to GitHub
git add .
git commit -m "Add PayOS integration"
git push origin main

# 2. Connect to Render.com
# - Select GitHub repo
# - Set branch: main
# - Build command: npm install
# - Start command: npm start

# 3. Set environment variables in Render dashboard
MONGO_URI=...
PAYOS_CLIENT_ID=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...
FRONTEND_URL=https://your-app.vercel.app
SESSION_SECRET=...
```

### Frontend (Vercel)

```bash
# 1. Push frontend to separate branch
# frontend/ folder should be at root

# 2. Connect to Vercel.com
# - Select GitHub repo
# - Framework: Other
# - Build command: leave empty
# - Output directory: . (root)

# 3. Update API_BASE in JS files
const API_BASE = 'https://your-backend.render.com';

# 4. Deploy
```

### DNS & HTTPS
- Frontend: `https://sentinel-frontend.vercel.app`
- Backend: `https://sentinel-backend.render.com`
- Both must have HTTPS enabled

---

## 7️⃣ Monitoring & Logs

### View Backend Logs (Render)
```
Dashboard → Your App → Logs tab
Look for: "Payment created", "License generated", errors
```

### View Frontend Errors
```javascript
// Browser DevTools
console.log()  // Check for API calls
Network tab   // Check request/response
Application → Cookies/LocalStorage
```

### Monitor Payments
```javascript
// MongoDB Atlas
Dashboard → Collections → payments
Filter: { status: "success" }
Export report if needed
```

---

## 📦 Project Structure After Integration

```
sentinelVN/
├── backend/
│   ├── models/
│   │   ├── client.js          ✅ UPDATED
│   │   ├── license.js         ✅ UPDATED
│   │   ├── payment.js         ✅ UPDATED
│   │   └── supportMsg.js
│   ├── routes/
│   │   ├── auth.routes.js     ✅ UPDATED
│   │   ├── payment.routes.js  ✅ NEW
│   │   ├── admin.routes.js
│   │   ├── client.routes.js
│   │   └── support.routes.js
│   ├── middleware/
│   ├── config/
│   ├── server.js              (unchanged)
│   ├── package.json           ✅ UPDATED
│   ├── .env                   ✅ UPDATED
│   └── .gitignore
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   ├── js/
│   │   │   ├── index.js       (unchanged)
│   │   │   ├── payment.js     ✅ UPDATED
│   │   │   └── ...
│   │   └── images/
│   ├── index.html             (unchanged)
│   ├── payment.html           ✅ NEW
│   └── ...
├── PAYOS_INTEGRATION.md       ✅ NEW
├── IMPLEMENTATION_SUMMARY.md  ✅ NEW
└── README.md                  (existing)
```

---

## ✅ Verification Checklist

Before going to production:

- [ ] Backend starts without errors
- [ ] Frontend loads successfully
- [ ] Session authentication works
- [ ] Payment page displays correctly
- [ ] QR code generates
- [ ] Payment flow completes
- [ ] License key is created
- [ ] License key appears in database
- [ ] Client can copy license key
- [ ] License has correct expiry date (+30 days)
- [ ] PayOS credentials are correct
- [ ] FRONTEND_URL is correct in .env
- [ ] CORS is configured properly
- [ ] MongoDB Atlas is accessible
- [ ] All npm packages are installed

---

## 🎓 References

- [PayOS Documentation](https://payos.vn/docs)
- [PayOS Node.js SDK](https://www.npmjs.com/package/@payos/node)
- [Express.js Guide](https://expressjs.com)
- [Mongoose Documentation](https://mongoosejs.com)

---

## 📞 Support

If you encounter issues:

1. **Check logs** - Backend logs Render / Frontend console
2. **Verify config** - All .env variables set correctly
3. **Test API** - Use Postman/cURL to test endpoints
4. **Database** - Check MongoDB Atlas collections
5. **PayOS** - Verify credentials in PayOS dashboard

---

**Ready to go live!** 🚀

Last updated: 2026-02-26
