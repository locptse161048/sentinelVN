# 📋 Email OTP Registration - Quick Reference Card

## 🎯 What Changed

```
OLD: Phone SMS OTP         NEW: Email OTP
├─ Firebase Auth          ├─ Backend Email Service
├─ SMS delivery           ├─ Email delivery
├─ Phone number required  └─ Email address only
└─ Country-dependent
```

---

## 📱 Registration Steps

### STEP 1: Personal Info
```
┌─────────────────────────────────┐
│ Họ và tên đệm: [Nguyễn Văn]    │
│ Giới tính: [Nam ▼]              │
│ Thành phố: [Hà Nội]             │
│ Email: [user@example.com]       │
│                                 │
│ [Tiếp tục]                      │
└─────────────────────────────────┘
```

### STEP 2: Email OTP
```
┌─────────────────────────────────┐
│ Nhập mã OTP được gửi đến email: │
│                                 │
│ Mã OTP: [123456]                │
│                                 │
│ ⏱️  Hạn: 02:00                   │ ← Server countdown
│                                 │
│ [Xác thực OTP]                  │
│ [🔄 Gửi lại OTP] Sau 2p         │ ← Disabled first 2 min
│                                 │
│ ⚠️ Còn 2 lần thử                 │ ← After 1 wrong attempt
└─────────────────────────────────┘
```

### STEP 3: Password
```
┌─────────────────────────────────┐
│ Mật khẩu: [••••••••]            │
│ Nhập lại: [••••••••]            │
│                                 │
│ ✓ Min 8 characters              │
│ ✓ 1 uppercase (A-Z)             │
│ ✓ 1 lowercase (a-z)             │
│ ✓ 1 digit (0-9)                 │
│                                 │
│ [Quay lại]  [Tạo tài khoản]     │
└─────────────────────────────────┘
```

### STEP 4: Success
```
┌─────────────────────────────────┐
│ ✅ Đăng ký thành công!          │
│                                 │
│ Đang chuyển hướng...            │
│                                 │
│ Sẽ chuyển sang client.html      │
└─────────────────────────────────┘
```

---

## 🔐 Security Summary

| Feature | Technical Details |
|---------|-------------------|
| **OTP Format** | 6 digits (000000-999999) |
| **OTP Validity** | 2 minutes from send |
| **OTP Storage** | Bcrypt hash (never plain) |
| **Failed Attempts** | Max 3 (auto-delete on 3rd) |
| **Resend Limit** | Max 3 times |
| **Resend Wait** | 2 minutes between each |
| **Rate Limit** | 5 sends per 10 min per IP |
| **Verification Limit** | 10 attempts per 15 min per IP |
| **Registration Limit** | 3 per hour per IP |
| **Auto-Delete** | TTL index after 2 minutes |
| **Countdown Sync** | Server timestamp (unfakeable) |

---

## 🔌 API Endpoints

```
POST /api/auth/send-otp
├─ Input: { email }
├─ Output: { message, expireAt }
├─ Rate: 5/10min
└─ Side: Sends OTP email

POST /api/auth/verify-otp
├─ Input: { email, otp }
├─ Output: { message, verified }
├─ Rate: 10/15min
└─ Side: Verifies and deletes OTP

POST /api/auth/resend-otp
├─ Input: { email }
├─ Output: { message, expireAt }
├─ Rate: 5/10min
└─ Side: Generates new OTP

POST /api/auth/register
├─ Input: { email, password..., emailVerified: true }
├─ Output: { message, user }
├─ Rate: 3/1hour
└─ Creates account
```

---

## 🌍 Environment Setup

```env
# Required .env variables
OTPEMAIL=your-email@gmail.com
OTPEMAIL_PASSWORD=your-app-password

# For Gmail:
# 1. myaccount.google.com/security
# 2. Enable 2-step verification
# 3. myaccount.google.com/apppasswords
# 4. Use generated password (NOT Gmail password)
```

---

## 🧪 Test Scenarios

### Happy Path (Success)
```
1. Fill Step 1 ✓
2. Check email for OTP ✓
3. Copy-paste OTP ✓
4. Fill Step 3 password ✓
5. Account created ✓
```

### Error: Wrong OTP
```
Attempt 1: "Mã OTP không hợp lệ. Còn 2 lần thử."
Attempt 2: "Mã OTP không hợp lệ. Còn 1 lần thử."
Attempt 3: "Vượt quá số lần thử. Yêu cầu mã OTP mới."
           → OTP auto-deleted
           → Must click "Gửi lại OTP" or start over
```

### Error: Resend Timing
```
T=0s:   Click "Gửi lại" → Button disabled "Sau 2p"
T=60s:  Still disabled "Sau 1p"
T=120s: Click enabled! → Sends new OTP
        Resend count: 1/3
```

### Error: Max Resends
```
Resend 1: ✓ New OTP sent (resendCount: 1)
Resend 2: ✓ New OTP sent (resendCount: 2)  
Resend 3: ✓ New OTP sent (resendCount: 3)
Resend 4: ✗ "Vượt quá số lần gửi lại"
```

---

## 📊 Status Indicators

```
UI Element          Status              Meaning
─────────────────────────────────────────────────────
[Tiếp tục] button   Enabled      Step 1 complete, ready
                    Disabled     Waiting for input

Countdown timer     02:00        OTP valid for 2 min
                    00:00        OTP expired ⚠️

[Gửi lại OTP]       Enabled      2 minutes elapsed
                    Disabled     Must wait (shows countdown)

Error message       Red text     Failed attempt
                    Green text   Success

Resend count        1/3          Can resend 2 more times
                    3/3          Can't resend anymore
```

---

## 🔍 Debugging Checklist

| Issue | Check | Solution |
|-------|-------|----------|
| OTP not received | Email config | Verify OTPEMAIL_PASSWORD is App Password |
| Timer wrong | Server time | Clock sync issue - reload page |
| "Quá nhiều" error | Rate limit | Wait for window (10-15 min) |
| Resend locked | Timer | Wait full 2 minutes |
| Backend crashes | Logs | `npm install nodemailer` |
| DB index missing | MongoDB | Create TTL index |

---

## 🔑 Key Codes & Errors

### Success Responses
```
200: Mã OTP đã được gửi
200: Xác thực email thành công
200: Đăng ký thành công
```

### Error Responses
```
400: Mã OTP không hợp lệ hoặc đã hết hạn
400: Vượt quá số lần thử
400: Vượt quá số lần gửi lại
400: Email đã được đăng ký
400: Email không hợp lệ
429: Quá nhiều lần yêu cầu [Rate Limited]
500: Lỗi server
```

---

## 📈 Flow Summary

```
┌─────────────────────────────────────────┐
│ User fills Step 1: Personal Info        │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Backend: POST /api/auth/send-otp        │
├─────────────────────────────────────────┤
│ • Generate OTP: "123456"                │
│ • Hash with bcrypt                      │
│ • Save to email_verifications           │
│ • Send email via nodemailer             │
│ • Return expireAt timestamp             │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Frontend: Show Step 2 OTP Input         │
├─────────────────────────────────────────┤
│ • Countdown from server timestamp       │
│ • Resend button disabled 2 min          │
│ • Wait for user OTP input               │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ User enters OTP: "123456"               │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Backend: POST /api/auth/verify-otp      │
├─────────────────────────────────────────┤
│ • Find OTP in DB                        │
│ • Check expiration                      │
│ • Compare plaintext to hash             │
│ • Delete OTP if correct                 │
│ • Return success                        │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Frontend: Show Step 3 Password          │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ User fills password & confirms          │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Backend: POST /api/auth/register        │
├─────────────────────────────────────────┤
│ • Verify emailVerified flag             │
│ • Hash password                         │
│ • Create Client account                 │
│ • Emit socket event to admin            │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Frontend: Show Step 4 Success           │
│ Redirect to client.html                 │
└─────────────────────────────────────────┘
```

---

## 💡 Pro Tips

✅ **Do:**
- Always use HTTPS (Render/Vercel handle this)
- Store OTPEMAIL_PASSWORD as environment variable
- Use Gmail App Password (not Gmail password)
- Monitor logs for OTP sending errors
- Test complete flow before going live
- Keep documentation updated

❌ **Don't:**
- Store plain OTP in database
- Use simple string comparison for OTP verify
- Allow unlimited resend attempts
- Skip rate limiting
- Hardcode email credentials
- Use browser-only timer (can be faked)

---

## 📞 Quick Help

**OTP not working?**
→ Check OTPEMAIL_PASSWORD is correct (must be Gmail App Password)

**Timer counting wrong?**
→ Reload page (browser cache)

**Can't resend?**
→ Wait 2 minutes from original send

**Account won't create?**
→ Make sure emailVerified is true in /register request

**Too many requests?**
→ Rate limited - wait 10-15 minutes

---

## 🎯 Remember

```
The 3 Most Important Security Features:

1️⃣ OTP ALWAYS hashed with bcrypt
   Never store plain "123456"

2️⃣ Countdown uses SERVER timestamp
   User cannot fake with browser time

3️⃣ Max 3 attempts, then auto-delete
   After 3 wrong: Must request new OTP
```

---

*Reference Card v1.0 - Email OTP Registration*
*Last Updated: 2024-12-25*
