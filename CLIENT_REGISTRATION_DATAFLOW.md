# Client Registration Data Flow Diagram

## 📊 Complete Registration Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLIENT REGISTRATION FLOW WITH EMAIL OTP                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: PERSONAL INFORMATION                                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  [Frontend: register.html]                                                   │
│    ↓                                                                          │
│    • Renders form with fields:                                              │
│      - firstName (text input)                                               │
│      - lastName (text input)                                                │
│      - gender (dropdown: nam/nữ/khác)                                       │
│      - city (text input)                                                    │
│      - email (email input)                                                  │
│    ↓                                                                          │
│  [Frontend: register.js - Client-side Validation]                           │
│    Validates:                                                                │
│    • All fields filled                                                       │
│    • Email format: /^[^\s@]+@[^\s@]+\.[^\s@]+$/                            │
│    ↓                                                                          │
│  [Data Stored in Memory]                                                    │
│    registrationData = {                                                      │
│      firstName: "John",                                                      │
│      lastName: "Doe",                                                        │
│      fullName: "John Doe",                                                   │
│      gender: "nam",                                                          │
│      city: "Hà Nội",                                                         │
│      email: "john@example.com"                                              │
│    }                                                                          │
│    ↓                                                                          │
│    [Transition to STEP 2]                                                    │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 2A: REQUEST OTP (EMAIL)                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  [Frontend -> Backend] HTTP POST                                             │
│  URL: /api/auth/send-otp                                                    │
│  Body: { email: "john@example.com" }                                        │
│  Headers: { Content-Type: application/json }                                │
│                                                                               │
│  ⚠️ Rate Limiter Applied: 5 OTP requests per 10 minutes per IP              │
│                                                                               │
│  [Backend: routes/auth.routes.js - POST /send-otp]                         │
│    ↓                                                                          │
│    • Validate email format                                                   │
│    ↓                                                                          │
│    • Check if email already registered in MongoDB (Client collection)       │
│    ↓                                                                          │
│    [utils/emailVerification.js]                                            │
│    • generateOTP() → Random 6-digit: e.g., "547382"                         │
│    ↓                                                                          │
│    • hashOTP(otp) → Bcrypt hash (10 rounds)                                 │
│    ↓                                                                          │
│  [Database: MongoDB]                                                        │
│    • Create/Update EmailVerification document:                              │
│      {                                                                       │
│        _id: ObjectId,                                                       │
│        email: "john@example.com",                                           │
│        otpHash: "$2a$10$...",      // Bcrypt hashed OTP                    │
│        attempts: 0,                 // Failed verification attempts          │
│        resendCount: 0,              // Number of resend requests            │
│        expireAt: 2026-04-15T17:20:02Z,  // Auto-delete after 2 minutes    │
│        createdAt: 2026-04-15T17:18:02Z  │
│      }                                                                       │
│      ↓                                                                        │
│      TTL Index on expireAt field → Auto-delete after expiration            │
│    ↓                                                                          │
│  [EMAIL SENDING via Gmail OAuth2]                                           │
│    • Get AccessToken from RefreshToken (OAuth2)                             │
│    ↓                                                                          │
│    • Create Nodemailer transporter with OAuth2                              │
│    ↓                                                                          │
│    • Send email with HTML:                                                  │
│      To: john@example.com                                                   │
│      Subject: 🔐 Mã xác thực Email - SENTINEL VN                           │
│      Body: (HTML template with OTP code highlighted)                        │
│      Text: "Mã xác thực của bạn là: 547382\nMã này sẽ hết hạn trong 2 phút.│
│    ↓                                                                          │
│  [Frontend Response]                                                        │
│    200 OK:                                                                   │
│    {                                                                         │
│      message: "Mã OTP đã được gửi đến email của bạn",                      │
│      expireAt: "2026-04-15T17:20:02Z"                                     │
│    }                                                                         │
│    ↓                                                                          │
│  [Frontend: Start Timer]                                                    │
│    • otpExpireAt = "2026-04-15T17:20:02Z"                                 │
│    • startCountdown() → Timer shows MM:SS                                   │
│    • Resend button disabled for 2 minutes                                   │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 2B: VERIFY OTP                                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  [User receives email and enters OTP]                                       │
│                                                                               │
│  [Frontend -> Backend] HTTP POST                                            │
│  URL: /api/auth/verify-otp                                                 │
│  Body: {                                                                    │
│    email: "john@example.com",                                             │
│    otp: "547382"                                                           │
│  }                                                                          │
│  ⚠️ Rate Limiter Applied: 10 requests per 15 minutes per IP                │
│                                                                               │
│  [Backend: routes/auth.routes.js - POST /verify-otp]                      │
│    ↓                                                                          │
│    • Validate email format                                                  │
│    • Validate OTP is 6 digits: /^\d{6}$/                                   │
│    ↓                                                                          │
│  [Database Query]                                                           │
│    • Find EmailVerification by email                                        │
│    ↓                                                                          │
│    Possible Responses:                                                      │
│                                                                               │
│    ❌ NOT FOUND:                                                             │
│       → Response: 400 "Mã OTP không hợp lệ hoặc đã hết hạn"               │
│       → End process                                                          │
│                                                                               │
│    ❌ EXPIRED (now > expireAt):                                             │
│       → Delete document from DB                                             │
│       → Response: 400 "Mã OTP không hợp lệ hoặc đã hết hạn"               │
│       → End process                                                          │
│                                                                               │
│    ❌ MAX ATTEMPTS EXCEEDED (attempts >= 3):                               │
│       → Delete document from DB                                             │
│       → Response: 400 "Vượt quá số lần thử. Vui lòng yêu cầu mã OTP mới." │
│       → End process                                                          │
│                                                                               │
│    ✅ VALID:                                                                 │
│       ↓                                                                       │
│       • verifyOTP(plainOTP, hashedOTP) → bcrypt.compare()                   │
│       ↓                                                                       │
│       ❌ MISMATCH:                                                            │
│           • Increment attempts++                                            │
│           • Save to DB                                                      │
│           • Response: 400 with attemptsLeft                                │
│           → End process                                                     │
│       ↓                                                                       │
│       ✅ MATCH:                                                              │
│           • Mark emailVerified as complete                                  │
│           • Delete EmailVerification document                               │
│           • Response: 200 { message: "OTP verified" }                      │
│           ↓                                                                   │
│  [Frontend Response]                                                         │
│    200 OK → Move to STEP 3                                                  │
│                                                                               │
│  [Frontend: Stop Timer]                                                     │
│    • Clear countdown interval                                               │
│    • Proceed to password creation                                           │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 2C: RESEND OTP (Optional)                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  [If user clicks Resend within 2 minutes]                                   │
│                                                                               │
│  [Frontend -> Backend] HTTP POST                                            │
│  URL: /api/auth/resend-otp                                                 │
│  Body: { email: "john@example.com" }                                       │
│  ⚠️ Rate Limiter Applied: 5 requests per 10 minutes per IP                  │
│                                                                               │
│  [Backend: routes/auth.routes.js - POST /resend-otp]                      │
│    ↓                                                                          │
│    • Find EmailVerification by email                                        │
│    ↓                                                                          │
│    • Check resendCount < 3 (max 3 resends)                                │
│    ↓                                                                          │
│    • Check 2-minute wait between resends                                   │
│    ↓                                                                          │
│    • Delete old OTP record                                                 │
│    • Generate new OTP and follow same flow as Step 2A                      │
│    ↓                                                                          │
│  [Frontend Response]                                                         │
│    200 OK → Reset OTP input field                                           │
│           → Restart countdown timers                                        │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: PASSWORD CREATION                                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  [Frontend: register.html - Step 3 Form]                                   │
│    Inputs:                                                                   │
│    • password (password input)                                              │
│    • passwordConfirm (password input)                                       │
│                                                                               │
│  [Frontend: Client-side Validation]                                         │
│    • Length >= 8 characters                                                 │
│    • Contains ≥ 1 uppercase: /[A-Z]/                                       │
│    • Contains ≥ 1 lowercase: /[a-z]/                                       │
│    • Contains ≥ 1 digit: /[0-9]/                                           │
│    • password === passwordConfirm                                           │
│    ↓                                                                          │
│    If validation FAILS → Show error message, stay on Step 3                │
│    If validation PASSES → Store in registrationData.password                │
│                           Move to Step 4                                     │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: FINAL REGISTRATION                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  [Frontend -> Backend] HTTP POST                                            │
│  URL: /api/auth/register                                                   │
│  Body: {                                                                    │
│    email: "john@example.com",                                             │
│    password: "SecurePass123",                                             │
│    fullName: "John Doe",                                                   │
│    firstName: "John",                                                       │
│    lastName: "Doe",                                                         │
│    gender: "nam",                                                           │
│    city: "Hà Nội",                                                          │
│    emailVerified: true          // Must be true (OTP verified)            │
│  }                                                                          │
│  ⚠️ Rate Limiter Applied: 3 registrations per hour per IP                   │
│                                                                               │
│  [Backend: routes/auth.routes.js - POST /register]                        │
│    ↓                                                                          │
│    • Server-side validation:                                                │
│      - Email valid format                                                   │
│      - fullName not empty, max 100 chars                                   │
│      - Password validation (see Step 3 rules)                               │
│      - city max 100 chars                                                  │
│      - gender in ['nam', 'nữ', 'khác']                                     │
│      - emailVerified === true (CRITICAL)                                   │
│    ↓                                                                          │
│    • Check if email already exists in Client collection                    │
│    ↓                                                                          │
│    • Hash password using bcrypt (10 rounds)                                │
│    ↓                                                                          │
│  [Database: MongoDB - Client Collection]                                   │
│    • Create new Client document:                                           │
│      {                                                                      │
│        _id: ObjectId,                                                      │
│        email: "john@example.com",                                         │
│        fullName: "John Doe",                                              │
│        firstName: "John",                                                  │
│        lastName: "Doe",                                                    │
│        gender: "nam",                                                      │
│        city: "Hà Nội",                                                     │
│        passwordHash: "$2a$10$...", // Bcrypt hashed                       │
│        role: "client",                                                     │
│        status: "đang hoạt động",                                          │
│        loginAttempts: 0,                                                   │
│        lastLoginAttempt: null,                                             │
│        createdAt: 2026-04-15T17:20:02Z,                                   │
│        updatedAt: 2026-04-15T17:20:02Z                                    │
│      }                                                                      │
│    ↓                                                                          │
│  [Socket.IO Notification - Real-time Admin Alert]                          │
│    • io.emit('new_client_registered', {                                    │
│      _id, email, fullName, firstName, lastName, gender,                   │
│      city, status, createdAt, licenseStatus, licenseKey, plan             │
│    })                                                                       │
│    → Admin dashboard receives real-time notification                       │
│    ↓                                                                          │
│  [Frontend Response]                                                         │
│    200 OK:                                                                   │
│    {                                                                        │
│      message: "Đăng ký thành công",                                        │
│      user: {                                                                │
│        _id: "...",                                                         │
│        email: "john@example.com",                                         │
│        fullName: "John Doe",                                              │
│        firstName: "John",                                                  │
│        lastName: "Doe",                                                    │
│        city: "Hà Nội"                                                      │
│      }                                                                      │
│    }                                                                         │
│    ↓                                                                          │
│  [Frontend: Success Screen]                                                 │
│    • Display "✅ Đăng ký thành công!"                                      │
│    • Redirect to login page after 2 seconds                                │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Overview

### EmailVerification Collection
```javascript
{
  _id: ObjectId,
  email: String,              // Lowercase
  otpHash: String,            // Bcrypt hashed 6-digit code
  attempts: Number,           // Failed verification attempts
  resendCount: Number,        // Resend requests
  expireAt: Date,             // TTL index - auto-delete
  createdAt: Date,
  updatedAt: Date
}
```

**TTL Index**: Automatically deletes documents 120 seconds after `expireAt`

### Client Collection
```javascript
{
  _id: ObjectId,
  email: String,              // Unique, lowercase
  fullName: String,
  firstName: String,
  lastName: String,
  gender: String,             // 'nam' | 'nữ' | 'khác'
  city: String,
  passwordHash: String,       // Bcrypt hashed
  phone: String,              // Optional
  role: String,               // 'client' | 'admin'
  status: String,             // 'đang hoạt động' | 'tạm ngưng'
  loginAttempts: Number,
  lastLoginAttempt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔐 Security Features

| Feature | Implementation |
|---------|-----------------|
| **OTP Generation** | Random 6-digit number |
| **OTP Storage** | Bcrypt hash (10 rounds) |
| **OTP Expiration** | 2 minutes (TTL auto-delete) |
| **Password Hashing** | Bcrypt (10 rounds) |
| **Rate Limiting** | IP-based limits per endpoint |
| **Attempt Limiting** | Max 3 failed OTP verifications |
| **Resend Limiting** | Max 3 resend requests, 2-min wait |
| **Email Verification** | Required before registration |
| **Account Lockout** | After 6 failed login attempts |

---

## ⚠️ Error Handling

| Error | Cause | Resolution |
|-------|-------|-----------|
| **Email đã được đăng ký** | Email exists in Client collection | Use different email |
| **Mã OTP không hợp lệ hoặc đã hết hạn** | OTP expired or not found | Request new OTP |
| **Vượt quá số lần thử** | 3+ failed OTP verification attempts | Request new OTP |
| **Không thể gửi email OTP** | Gmail OAuth2 failure | See OAuth2 troubleshooting |
| **Mật khẩu phải tối thiểu 8 ký tự** | Password too short | Increase length |
| **Email chưa được xác thực** | emailVerified !== true | Complete Step 2 (OTP) |

---

## 📊 Data Flow Summary

```
Personal Info (Step 1)
    ↓ Validation
Stored in Memory (registrationData)
    ↓
Send OTP to Email (Step 2A)
    ↓ 
Store Hashed OTP in DB + Send Email
    ↓
User Verifies OTP (Step 2B)
    ↓
Compare Plain OTP with Hashed from DB
    ↓ Success ✅
Create Password (Step 3)
    ↓
Register User (Step 4)
    ↓
Create Client Document in DB
    ↓
Emit Socket Event to Admin
    ↓ Success ✅
Redirect to Login Page
```

---

## 🔄 Rate Limits Summary

- **send-otp**: 5 per 10 minutes per IP
- **verify-otp**: 10 per 15 minutes per IP
- **resend-otp**: 5 per 10 minutes per IP (with max 3 resends per request)
- **register**: 3 per hour per IP
- **login**: 10 per 15 minutes per IP

**Note**: Rate limiters are IP-based and stored in memory via `express-rate-limit`
