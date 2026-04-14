# 📧 New Email OTP Registration Flow - Implementation Guide

## 🎯 Overview

The registration flow has been updated to use **Email-based OTP verification** instead of Firebase Phone SMS OTP. This provides:

- ✅ More reliable email delivery compared to SMS
- ✅ 6-digit OTP with 2-minute expiration (TTL auto-delete)
- ✅ Server-side countdown timer synchronization (prevents frontend manipulation)
- ✅ Rate limiting on OTP endpoints
- ✅ Max 3 failed OTP verification attempts
- ✅ Max 3 OTP resend requests (2-minute wait between resends)
- ✅ Secure hashing of OTP in database

---

## 📋 Registration Steps

### Step 1: Personal Information
- **Fields:** First Name, Last Name, Gender, City, Email
- **Validation:** All fields required, email format validated
- **Action:** Click "Tiếp tục" to proceed to Step 2

### Step 2: Email OTP Verification
- **Auto-send:** OTP automatically sent to email after Step 1
- **Display:** 6-digit OTP code sent to user's email
- **Countdown:** Server-based countdown timer (NOT frontend timer)
  - User sees real-time countdown: MM:SS format
  - Timer calculated from server's `expireAt` timestamp
  - Prevents user from manipulating time via browser tools
- **OTP Input:** User enters 6-digit code from email
- **Resend Button:**
  - Disabled for first 2 minutes
  - Max 3 resends per registration
  - Each resend deletes old OTP and generates new one
- **Verification:**
  - Max 3 failed attempts
  - After 3 failures: OTP automatically deleted
  - On success: OTP deleted, proceed to Step 3

### Step 3: Password Creation
- **Fields:** Password, Confirm Password
- **Requirements:**
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 digit
- **Confirm:** Must match password field exactly
- **Action:** Click "Tạo tài khoản" to complete registration

### Step 4: Success
- Shows loading spinner while creating account
- On success: Redirects to `client.html`
- On error: Displays error message and allows retry

---

## 🛠️ Backend Implementation

### New Models
**`backend/models/emailVerification.js`**
- Stores temporary email verification records
- Fields:
  - `email` - User's email (indexed for fast queries)
  - `otpHash` - Bcrypt-hashed OTP (never store plain OTP)
  - `attempts` - Failed verification attempts (max 3)
  - `resendCount` - Number of resends (max 3)
  - `lastResendTime` - Timestamp of last resend request
  - `createdAt` - Document creation time
  - `expireAt` - Expiration time for TTL index
- **TTL Index:** Auto-deletes documents 2 minutes after creation

### New Utilities
**`backend/utils/emailVerification.js`**
Functions:
- `generateOTP()` - Creates random 6-digit code
- `hashOTP(otp)` - Bcrypt hash for secure storage
- `verifyOTP(plainOTP, hashedOTP)` - Compare with constant-time comparison
- `sendOTPEmail(email, otp)` - Send OTP via email
- `createTransporter()` - Initialize nodemailer

### New Endpoints

#### 1. **POST /api/auth/send-otp** ⏱️ Rate Limited (5 per 10 min)
Send OTP to email
```javascript
Request Body:
{
  "email": "user@example.com"
}

Response (Success):
{
  "message": "Mã OTP đã được gửi đến email của bạn",
  "expireAt": "2024-12-25T10:35:00.000Z"  // Server timestamp for countdown
}

Response (Error):
{
  "message": "Email đã được đăng ký" // or other error
}
```

#### 2. **POST /api/auth/verify-otp** ⏱️ Rate Limited (10 per 15 min)
Verify OTP code
```javascript
Request Body:
{
  "email": "user@example.com",
  "otp": "123456"
}

Response (Success):
{
  "message": "Xác thực email thành công",
  "email": "user@example.com",
  "verified": true
}

Response (Failed Attempt):
{
  "message": "Mã OTP không hợp lệ. Còn 2 lần thử.",
  "attemptsLeft": 2
}

Response (Max Attempts):
{
  "message": "Vượt quá số lần thử. Vui lòng yêu cầu mã OTP mới."
}
```

#### 3. **POST /api/auth/resend-otp** ⏱️ Rate Limited (5 per 10 min)
Request new OTP (max 3 times)
```javascript
Request Body:
{
  "email": "user@example.com"
}

Response (Success):
{
  "message": "Mã OTP mới đã được gửi đến email của bạn",
  "expireAt": "2024-12-25T10:37:00.000Z",
  "resendCount": 1
}

Response (Wait Required):
{
  "message": "Vui lòng chờ 1 phút trước khi gửi lại",
  "waitSeconds": 60
}

Response (Max Resends):
{
  "message": "Vượt quá số lần gửi lại. Vui lòng yêu cầu mã OTP mới."
}
```

### Updated Register Endpoint

**POST /api/auth/register** ⏱️ Rate Limited (3 per hour)
```javascript
Request Body (UPDATED):
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "fullName": "Nguyễn Văn A",
  "firstName": "Nguyễn Văn",
  "lastName": "A",
  "gender": "nam",
  "city": "Hà Nội",
  "emailVerified": true  // ✅ REQUIRED - must be true
}

// Old phone fields REMOVED:
// "phone": "0909123456"
// "phoneVerified": true
```

---

## 🎨 Frontend Implementation

### HTML Changes (`register.html`)

**Removed:**
- Firebase SDK scripts
- Phone number input field
- reCAPTCHA container

**Added:**
- OTP countdown timer display (MM:SS)
- Resend OTP button with countdown
- Resend attempt counter

**Key Elements:**
```html
<!-- Countdown Timer -->
<div id="countdownSection">
  Mã OTP sẽ hết hạn trong: <span id="countdown">02:00</span>
</div>

<!-- Resend Button (disabled first 2 minutes) -->
<button id="resendOtpBtn" disabled>🔄 Gửi lại OTP</button>
<span id="resendCountdown">Sau 2p</span>
```

### JavaScript Changes (`register.js`)

**Key Functions:**

1. **sendOTP()** - Calls `/api/auth/send-otp`
   - Extracts server-provided `expireAt` timestamp
   - Stores in `otpExpireAt` variable
   - Starts countdown timer

2. **startCountdown()** - Server-Synchronized Timer
   ```javascript
   // Calculate seconds using server timestamp (NOT local time)
   const now = new Date();
   const expireTime = new Date(otpExpireAt);
   const secondsLeft = Math.max(0, 
     Math.floor((expireTime - now) / 1000)
   );
   ```
   - Updates every 1 second
   - Immune to browser manipulation
   - Syncs with server expiration

3. **startResendCountdown()** - 2-Minute Wait
   - Locked for 120 seconds after OTP sent
   - Button disabled and grayed out
   - Countdown updates every second
   - Button enabled when countdown reaches 0

4. **verifyOTP()** - Calls `/api/auth/verify-otp`
   - Validates 6-digit format
   - Shows attempts remaining
   - Auto-advances to Step 3 on success

5. **resendOTP()** - Calls `/api/auth/resend-otp`
   - Validates 2-minute wait requirement
   - Clears previous OTP from input
   - Resets attempt counter
   - Restarts both countdowns

---

## 🔐 Security Features

### 1. OTP Storage
- ❌ **NEVER** store plain OTP in database
- ✅ Always hash with bcrypt (10 rounds)
- ✅ Use constant-time comparison when verifying

### 2. Rate Limiting
```javascript
OTP Send:     5 requests per 10 minutes per IP
OTP Verify:   10 requests per 15 minutes per IP
Registration: 3 registrations per hour per IP
```

### 3. Attempt Limits
```javascript
OTP Verification: Max 3 failed attempts
OTP Resend:       Max 3 times per 2 minutes
```

### 4. Countdown Validation
- ✅ Server provides `expireAt` timestamp (UTC)
- ❌ Frontend CANNOT manipulate time
- ✅ Uses server's expiration time as source of truth
- ✅ Client clock skew doesn't affect verification

### 5. Email Verification
- ✅ OTP deleted from database immediately after successful verification
- ✅ OTP auto-deleted after 2-minute TTL
- ✅ OTP deleted after 3 failed attempts
- ✅ Old OTP deleted when new one is sent

---

## 🌍 Environment Variables

Add to `.env` file:

```env
# Email OTP Configuration
OTPEMAIL=your-email@gmail.com
OTPEMAIL_PASSWORD=your-app-password

# Or use these if preferred
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# For Gmail: Generate App Password at https://myaccount.google.com/apppasswords
# NOT your regular Gmail password
```

---

## 🧪 Testing Guide

### Manual Test: Complete Registration

1. **Step 1:** Fill in personal info
   - First Name: "Nguyễn"
   - Last Name: "Văn A"
   - Gender: "Nam"
   - City: "Hà Nội"
   - Email: "test@example.com"
   - Click "Tiếp tục"

2. **Step 2:** OTP Verification
   - Check email for OTP (6 digits)
   - Copy OTP code
   - Paste into "Nhập mã OTP" field
   - Click "Xác thực OTP"
   - ✅ Should show success and move to Step 3

3. **Step 3:** Password
   - Password: "TestPass123"
   - Confirm: "TestPass123"
   - Click "Tạo tài khoản"

4. **Step 4:** Success
   - ✅ Loading spinner appears
   - ✅ Redirected to `client.html`

### Edge Cases to Test

| Test Case | Expected Behavior |
|-----------|-------------------|
| Wait 2 min before resend | Resend button still disabled after resend |
| Resend 3 times | 4th resend fails with "max resends" error |
| Wrong OTP | Show "Mã OTP không hợp lệ. Còn X lần thử." |
| 3 wrong attempts | Automatically delete OTP, require new send |
| Wait until OTP expires | Show "Mã OTP không hợp lệ hoặc đã hết hạn" |
| Network failure on send | Allow retry without resend count penalty |
| Close browser mid-OTP | Reloading page should ask to enter OTP again |

### Browser Console Logs

```javascript
// Successful flow
[INIT] ✅ Register.js initialized - Email OTP Flow Ready
[OTP] ✅ OTP sent successfully
[OTP VERIFY] Success shown
[REGISTER] ✅ User registered
```

---

## 📱 API Testing with cURL

```bash
# Send OTP
curl -X POST https://sentinelvn.onrender.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Verify OTP
curl -X POST https://sentinelvn.onrender.com/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'

# Register (after OTP verified)
curl -X POST https://sentinelvn.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"TestPass123",
    "fullName":"Nguyễn Văn A",
    "firstName":"Nguyễn Văn",
    "lastName":"A",
    "gender":"nam",
    "city":"Hà Nội",
    "emailVerified":true
  }'
```

---

## 🚀 Deployment Checklist

- [ ] Install nodemailer: `npm install nodemailer`
- [ ] Set `OTPEMAIL` and `OTPEMAIL_PASSWORD` in production `.env`
- [ ] For Gmail: Create App Password (2FA required)
- [ ] Test OTP sending in production environment
- [ ] Monitor `/api/auth/send-otp` endpoint for rate limiting
- [ ] Monitor `/api/auth/verify-otp` endpoint
- [ ] Check MongoDB TTL index on `email_verifications` collection
- [ ] Verify `expireAt` timestamps are in UTC format
- [ ] Test with different email providers (Gmail, Outlook, etc.)

---

## 📊 Database Changes

### New Collection: `email_verifications`

**Indexes:**
```javascript
// TTL Index (auto-delete after 2 minutes)
db.email_verifications.createIndex({ "expireAt": 1 }, { expireAfterSeconds: 0 })

// Email index (fast queries)
db.email_verifications.createIndex({ "email": 1 })
```

**Sample Document:**
```javascript
{
  "_id": ObjectId("..."),
  "email": "user@example.com",
  "otpHash": "$2a$10$...",  // Bcrypt hash of 123456
  "attempts": 1,
  "resendCount": 0,
  "lastResendTime": null,
  "createdAt": ISODate("2024-12-25T10:33:00.000Z"),
  "expireAt": ISODate("2024-12-25T10:35:00.000Z")
}
```

### Updated Collection: `clients`

**Removed Fields:**
- `phone` (optional)
- `phoneVerified` (optional)

**Fields** remain:
- `email` (unique)
- `passwordHash`
- `fullName`
- `firstName`
- `lastName`
- `gender`
- `city`
- `role`
- `status`
- `createdAt`

---

## 🔄 Migration from Phone OTP to Email OTP

If you had existing phone SMS registrations:

```javascript
// Old registration data
{
  email: "user@example.com",
  phone: "0909123456",
  phoneVerified: true
}

// New registration (email OTP only)
{
  email: "user@example.com",
  // phone and phoneVerified removed from registration flow
  // (can still be added later in user profile setup)
}
```

---

## 💡 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| OTP email not received | Gmail SMTP issue | Check OTPEMAIL_PASSWORD is App Password, not Gmail password |
| Countdown shows wrong time | Frontend timer desync | Clear browser cache, reload page |
| "Quá nhiều lần yêu cầu" | Rate limit hit | Wait 10-15 minutes before retry |
| OTP hashed incorrectly | Bcrypt version mismatch | Ensure `bcryptjs` ^3.0.0 installed |
| TTL index not working | MongoDB issue | Recreate TTL index on `email_verifications` collection |
| Email with special chars fails | Email validation | Update regex if needed for edge cases |

---

## 📝 Notes

- OTP validity: 2 minutes
- OTP format: 6 digits (000000-999999)
- Resend wait: 2 minutes between attempts
- Resend limit: 3 times maximum
- Failed attempts: 3 before auto-delete
- Rate limits are per-IP based
- All timestamps in UTC format
- Frontend countdown synced with server time, not browser time

---

**Last Updated:** 2024-12-25
**Version:** 1.0.0 - Email OTP Implementation
