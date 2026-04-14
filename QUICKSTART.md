# 🚀 Quick Start Guide - Email OTP Registration

## ⚡ 5-Minute Setup

### 1️⃣ Install Dependencies
```bash
cd backend
npm install nodemailer
```

### 2️⃣ Configure Email (.env)
```env
# Add to your .env file
OTPEMAIL=your-email@gmail.com
OTPEMAIL_PASSWORD=your-app-password

# ⚠️ For Gmail:
# 1. Enable 2-Factor Authentication: myaccount.google.com/security
# 2. Generate App Password: myaccount.google.com/apppasswords
# 3. Use that password above (NOT your Gmail password)
```

### 3️⃣ Deploy Code
```bash
# Backend (Render)
git add .
git commit -m "Add email OTP registration"
git push  # Auto-deploys via webhook

# Frontend (Vercel)
git add .
git commit -m "Add email OTP registration"
git push  # Auto-deploys via webhook
```

### 4️⃣ Test Registration
1. Open: https://sentinelvn-one.vercel.app/register.html
2. Fill Step 1: Name, Gender, City, Email
3. Check email inbox for OTP
4. Copy 6-digit code to Step 2
5. Fill Step 3: Password
6. ✅ Account created!

---

## 🎯 What's New

| Component | Status | Details |
|-----------|--------|---------|
| Step 1: Personal Info | ✅ | Name, Gender, City, Email |
| Step 2: Email OTP | ✅ | 6-digit code to email (2-min validity) |
| Step 3: Password | ✅ | Min 8 chars, 1 upper, 1 lower, 1 digit |
| Countdown Timer | ✅ | Server-synced MM:SS display |
| Resend Limit | ✅ | Max 3 times, 2-min wait between |
| Attempt Limit | ✅ | Max 3 wrong OTP, then auto-delete |
| Rate Limiting | ✅ | IP-based on all endpoints |
| OTP Hashing | ✅ | Bcrypt - never plain text stored |

---

## 📧 Email Example

**Subject:** 🔐 Mã xác thực Email - SENTINEL VN

```
┌────────────────────────────────────┐
│       SENTINEL VN                  │
│    Security-as-a-Plugin            │
│                                    │
│ Xác thực Email của Bạn             │
│                                    │
│ ┌──────────────────────────────┐  │
│ │  123456                      │  │
│ └──────────────────────────────┘  │
│                                    │
│ ⏰ Hạn sử dụng: 2 phút              │
│ 🔐 Không chia sẻ mã này!           │
│                                    │
│ © SENTINEL VN                      │
└────────────────────────────────────┘
```

---

## 🧪 Quick Tests

### Test 1: Happy Path (2 minutes)
```
1. Fill Step 1 → Click "Tiếp tục"
2. Wait for email (~30 seconds)
3. Copy OTP from email
4. Paste into Step 2 → Click "Xác thực OTP"
5. Fill password → Click "Tạo tài khoản"
6. ✅ Redirected to client.html
```

### Test 2: Wrong OTP (1 minute)
```
1. Step 1 → Step 2 (OTP sent)
2. Enter wrong code (e.g., "000000")
3. ✅ See error: "Mã OTP không hợp lệ. Còn 2 lần thử."
4. Try again 2 more times
5. ✅ 3rd wrong: "Vượt quá số lần thử..."
6. Must request new OTP
```

### Test 3: Resend Button (3 minutes)
```
1. Step 1 → Step 2 (OTP sent)
2. Resend button is GRAYED OUT with "Sau 2p"
3. Wait exactly 2 minutes
4. ✅ Button becomes BLUE and clickable
5. Click → ✅ New OTP sent
6. Repeat max 3 times
```

### Test 4: Browser Clock Doesn't Matter (1 minute)
```
1. Open DevTools Console
2. Try: > new Date()  # Check browser time
3. Try: > localStorage.expireAt = "2099-01-01"  # Try to fake it
4. OTP still validates against SERVER time
5. ✅ Cannot be hacked!
```

---

## 🔗 API Testing (cURL)

### Send OTP
```bash
curl -X POST https://sentinelvn.onrender.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Response:
# {
#   "message": "Mã OTP đã được gửi đến email của bạn",
#   "expireAt": "2024-12-25T10:35:00.000Z"
# }
```

### Verify OTP
```bash
curl -X POST https://sentinelvn.onrender.com/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'

# Response (success):
# {
#   "message": "Xác thực email thành công",
#   "verified": true
# }

# Response (wrong):
# {
#   "message": "Mã OTP không hợp lệ. Còn 2 lần thử.",
#   "attemptsLeft": 2
# }
```

### Resend OTP
```bash
curl -X POST https://sentinelvn.onrender.com/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Response (success):
# {
#   "message": "Mã OTP mới đã được gửi...",
#   "expireAt": "2024-12-25T10:37:00.000Z",
#   "resendCount": 1
# }

# Response (too soon):
# {
#   "message": "Vui lòng chờ 1 phút trước khi gửi lại",
#   "waitSeconds": 60
# }
```

### Register
```bash
curl -X POST https://sentinelvn.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"SecurePass123",
    "fullName":"Nguyễn Văn A",
    "firstName":"Nguyễn Văn",
    "lastName":"A",
    "gender":"nam",
    "city":"Hà Nội",
    "emailVerified":true
  }'

# Response (success):
# {
#   "message": "Đăng ký thành công",
#   "user": {
#     "_id": "...",
#     "email": "test@example.com",
#     "fullName": "Nguyễn Văn A"
#   }
# }
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| OTP not received | Check OTPEMAIL_PASSWORD is App Password |
| "Quá nhiều lần yêu cầu" | Wait 10+ minutes (rate limit) |
| Resend button not working | Wait full 2 minutes from original send |
| Countdown wrong | Reload page (browser cache issue) |
| OTP expires in 1 minute | Check server time vs browser time |
| Backend crashes | Check nodemailer is installed: `npm install nodemailer` |

---

## 📊 Monitoring

### Check Logs
```bash
# Render Dashboard
# View Function Logs → Backend logs

# Look for:
# [OTP SEND] ✅ OTP sent to: user@example.com
# [OTP VERIFY] ✅ OTP verified for: user@example.com
# [AUTH REGISTER] ✅ User registered via email OTP: user@example.com
```

### Database Check
```javascript
// MongoDB Atlas
// Collections → email_verifications

// Healthy state:
// - Few documents in collection
// - All have expireAt in past (TTL deleting them)
// - No stale records

// Problem if:
// - Hundreds of documents
// - expireAt values in past (means TTL not working)
// - Solution: Recreate TTL index
```

---

## ✅ Pre-Launch Checklist

- [ ] nodemailer installed (`npm install nodemailer`)
- [ ] OTPEMAIL set in .env
- [ ] OTPEMAIL_PASSWORD created (Gmail App Password)
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Test registration flow end-to-end
- [ ] Check OTP email received
- [ ] Verify countdown timer works
- [ ] Test wrong OTP error handling
- [ ] Test resend button (2-minute wait)
- [ ] Test all 3 resends
- [ ] Monitor logs for errors
- [ ] Check MongoDB TTL index created
- [ ] All rate limits working

---

## 🚀 Go Live!

Once checklist complete:

1. **Announce to users:** "New faster registration with email OTP!"
2. **Monitor:** First hour - watch logs and error rates
3. **Support:** Be ready for questions about "Why email instead of phone?"
4. **Celebrate:** 🎉 New secure registration flow live!

---

## 📚 Full Documentation

For more details, see:
- [OTP_EMAIL_REGISTRATION.md](./OTP_EMAIL_REGISTRATION.md) - Complete guide
- [FLOW_DIAGRAMS.md](./FLOW_DIAGRAMS.md) - Visual flow diagrams
- [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) - What changed

---

## 💬 Questions?

Check the [OTP_EMAIL_REGISTRATION.md](./OTP_EMAIL_REGISTRATION.md) full documentation or ask in team chat!

---

**Ready to launch!** 🚀

*Last updated: 2024-12-25*
