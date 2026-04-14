# 📊 Registration Flow Diagram

## User Journey
```
START
  ↓
[Step 1: Personal Info]
  ├─ Input: Name, Gender, City, Email
  ├─ Validate all fields required
  └─ Click "Tiếp tục"
     ↓
[Step 2: Email OTP]
  ├─ OTP auto-sent to user's email
  ├─ Show countdown timer (MM:SS from server)
  ├─ User may:
  │  ├─ Enter correct OTP → Step 3 ✓
  │  ├─ Enter wrong OTP (max 3×) → Auto-delete & retry
  │  └─ Resend OTP (max 3×) → Wait 2 min between each
  └─ After 2 minutes of NO activity: OTP expires
     ↓
[Step 3: Password]
  ├─ Input: Password (8+ chars, 1 upper, 1 lower, 1 digit)
  ├─ Confirm Password match
  └─ Click "Tạo tài khoản"
     ↓
[Step 4: Success]
  ├─ Account created in database
  ├─ Dashboard socket notified
  └─ Redirect to client.html ✓
     ↓
  END
```

---

## Backend Process Flow

```
User sends OTP request
        ↓
POST /api/auth/send-otp
        ↓
[Rate Limit Check] ← 5 per 10 min per IP
        ↓
[Email Validation]
        ↓
[Email Already Registered?]
  ├─ YES → Error 400
  └─ NO → Continue
        ↓
[Generate OTP: 6 digits]
        ↓
[Hash OTP with Bcrypt]
        ↓
[Delete Old OTP if exists]
        ↓
[Save to DB: email_verifications]
  ├─ otpHash (never plain!)
  ├─ expireAt (now + 2 min)
  └─ attempts: 0, resendCount: 0
        ↓
[Send Email with OTP]
        ↓
Return expireAt to frontend
        ↓
END
```

---

## OTP Verification Flow

```
User enters OTP
        ↓
POST /api/auth/verify-otp
        ↓
[Rate Limit Check] ← 10 per 15 min per IP
        ↓
[Format Validation: 6 digits?]
        ↓
[Find OTP in DB by email]
  ├─ Not found → Error
  └─ Found → Continue
        ↓
[Check Expiration]
  ├─ Expired → Delete & Error
  └─ Valid → Continue
        ↓
[Check Attempts < 3]
  ├─ >= 3 → Delete & Error
  └─ < 3 → Continue
        ↓
[Constant-Time Compare]
  plainOTP vs otpHash (bcrypt)
        ↓
[Match?]
  ├─ NO:
  │  ├─ attempts++
  │  ├─ Save to DB
  │  └─ Return error + attemptsLeft
  │
  └─ YES:
     ├─ Delete from DB
     └─ Return success ✓
        ↓
END
```

---

## OTP Resend Flow

```
User clicks "Gửi lại OTP"
        ↓
POST /api/auth/resend-otp
        ↓
[Rate Limit Check] ← 5 per 10 min per IP
        ↓
[Find OTP in DB by email]
        ↓
[Check resendCount < 3]
  ├─ >= 3 → Error
  └─ < 3 → Continue
        ↓
[Check time since creation >= 2 min]
  ├─ < 2 min → Error + waitTime
  └─ >= 2 min → Continue
        ↓
[Generate NEW OTP: 6 digits]
        ↓
[Hash with Bcrypt]
        ↓
[Update DB: email_verifications]
  ├─ otpHash: NEW hash
  ├─ attempts: 0 (RESET)
  ├─ resendCount++ (increment)
  └─ expireAt: now + 2 min (RESET)
        ↓
[Send NEW OTP Email]
        ↓
Return new expireAt & resendCount
        ↓
Frontend restarts countdowns
        ↓
END
```

---

## Timer Synchronization

```
Frontend                           Backend
  │                                  │
  ├─ POST /send-otp                 │
  │                ─────────────────→│
  │                                  ├─ Generate OTP
  │                                  ├─ Set expireAt = now + 120s
  │                                  │
  │                ←─────────────────┤
  │  { expireAt: "2024-12-25..." }  │
  │                                  │
  ├─ Parse expireAt from response    │
  ├─ startCountdown() loop           │
  │  ├─ Get current time              │
  │  ├─ Calculate: secondsLeft =       │
  │  │  (expireAt - now) / 1000        │
  │  ├─ Display: MM:SS format          │
  │  └─ Update every 1 second          │
  │                                  │
  │  Timeline Example:                │
  │  ├─ T=0s: expireAt provided       │
  │  ├─ T=5s: countdown = 02:15       │
  │  ├─ T=60s: countdown = 01:00      │
  │  ├─ T=119s: countdown = 00:01     │
  │  └─ T=120s: countdown = 00:00 ✓   │
  │     (OTP expired, shows warning)  │
  │                                  │
  └─ User cannot manipulate time!    │
     (Even if they change system      │
      time or browser console,         │
      server time is source of truth)  │
```

---

## Security Features

```
1. OTP Storage
   ┌─────────────┐
   │ Plain OTP   │ ← NEVER stored
   │ "123456"    │
   └─────────────┘
           ↓
         Hash
           ↓
   ┌──────────────────────────────────┐
   │ "$2a$10$...(bcrypt)...$2a$10$"   │ ← Stored in DB
   └──────────────────────────────────┘

2. Verification
   User Input:  "123456"
        ↓
   constant_time_compare
        ↓
   Stored Hash: "$2a$10$..."
   
   Not plain string comparison!

3. Rate Limiting (Per IP)
   ┌─────────────────────┐
   │  send-otp endpoint  │
   │  max: 5/10 min      │
   ├─────────────────────┤
   │ verify-otp endpoint │
   │  max: 10/15 min     │
   ├─────────────────────┤
   │ register endpoint   │
   │  max: 3/hour        │
   └─────────────────────┘

4. Attempt Limiting
   ┌──────────────────────────────────┐
   │ 1st wrong OTP → Error             │
   │ 2nd wrong OTP → Error             │
   │ 3rd wrong OTP → ERROR + AUTO-DEL  │
   │ 4th wrong OTP → New OTP needed!   │
   └──────────────────────────────────┘

5. TTL Auto-Deletion
   ┌────────────────────────┐
   │ OTP created at T=0s    │
   │ Expires at T=120s      │
   └────────────────────────┘
           ↓
   MongoDB TTL Index
   ├─ Checks every 60s
   ├─ Finds expired docs
   └─ Deletes automatically
           ↓
   No stale OTP in database!
```

---

## State Machine

```
                    ┌──────────────────────┐
                    │  INITIAL STATE       │
                    │  No OTP in database  │
                    └──────────────────────┘
                           ↓
                   /────────────────\
                  /  User fills      \
                 │   Step 1 form      │
                  \                  /
                   \──────────────────/
                           ↓
           POST /api/auth/send-otp
                           ↓
                    ┌──────────────────────┐
                    │  OTP_PENDING         │
                    ├──────────────────────┤
                    │ otpHash: hashed      │
                    │ attempts: 0          │
                    │ resendCount: 0       │
                    │ expireAt: now + 2m   │
                    └──────────────────────┘
                      ↙   ↙   ↙   ↓
                    /    /    /    \
              [Wrong] [Wrong] [Wrong] [Correct]
                      \    \    \    ↙
                      POST /api/auth/verify-otp
                             (3 attempts)
               ┌─────────────────────────────────┐
        ┌─────→│ attempts++ OR ✓ verified        │←─────┐
        │      └─────────────────────────────────┘      │
        │                    ↓                          │
        │         [attempts < 3] → continue             │
        │         [attempts = 3] → DELETE RECORD        │
        │                    ↓                          │
        │      ┌──────────────────────────┐            │
        └──────│ User must request new    │────────────┘
               │ OTP via send-otp again   │
               └──────────────────────────┘
                          ↑
                   (start again)
                          
               [Correct OTP verified]
                           ↓
                 DELETE from database
                           ↓
                   ┌──────────────────┐
                   │ EMAIL_VERIFIED   │
                   │ Can proceed to   │
                   │ Step 3 Password  │
                   └──────────────────┘
                           ↓
                POST /api/auth/register
                           ↓
                    ┌──────────────────┐
                    │ ACCOUNT_CREATED  │
                    │ Success! ✓       │
                    └──────────────────┘
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      USER BROWSER                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  register.html + register.js                         │   │
│  │  • Step 1: Personal Info Form                        │   │
│  │  • Step 2: OTP Input + Countdown Timer               │   │
│  │  • Step 3: Password Form                             │   │
│  │  • Step 4: Success Message                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
              ↑                                    ↓
              │                                    │
          JSON API                           JSON API
              │                                    ↓
           [HTTPS]                   ┌──────────────────────────┐
              ↑                       │  BACKEND (Node.js)       │
              │                       ├──────────────────────────┤
              │                       │ Route: /api/auth/        │
              │                       │ • /send-otp              │
              │                       │ • /verify-otp            │
              │                       │ • /resend-otp            │
              │                       │ • /register              │
              │                       └──────────────────────────┘
              │                               ↓
              │                     ┌──────────────────────────┐
              └─────────────────────│  NODEMAILER             │
                                    │  Sends OTP email         │
                                    │  via Gmail SMTP          │
                                    └──────────────────────────┘
                                             ↓
                                    ┌──────────────────────────┐
                                    │  USER EMAIL INBOX        │
                                    │  Receives: 123456        │
                                    └──────────────────────────┘

                                    ┌──────────────────────────┐
              ┌─────────────────────│  MONGODB ATLAS           │
              │                     ├──────────────────────────┤
              │                     │ Collections:             │
              │                     │ • email_verifications    │
              │                     │   (OTP + metadata)       │
              │                     │ • clients (users)        │
              │                     │ • sessions               │
              │                     └──────────────────────────┘
              │
         CRUD: Create/Read/Update/Delete OTP records
```

---

## Endpoint Summary

```
┌────────────────────────────────────────────────────────────────┐
│                        API ENDPOINTS                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ POST /api/auth/send-otp                                       │
│ ├─ Rate: 5 per 10 min per IP                                  │
│ ├─ Input: { email }                                           │
│ ├─ Output: { message, expireAt }                              │
│ └─ Side: Sends OTP email, stores hashed OTP                   │
│                                                                │
│ POST /api/auth/verify-otp                                     │
│ ├─ Rate: 10 per 15 min per IP                                 │
│ ├─ Input: { email, otp }                                      │
│ ├─ Output: { message, verified: true }                        │
│ └─ Side: Deletes OTP if correct, increments attempts if wrong │
│                                                                │
│ POST /api/auth/resend-otp                                     │
│ ├─ Rate: 5 per 10 min per IP                                  │
│ ├─ Input: { email }                                           │
│ ├─ Output: { message, expireAt, resendCount }                 │
│ └─ Side: Generates new OTP, resets attempts, increments count │
│                                                                │
│ POST /api/auth/register                                       │
│ ├─ Rate: 3 per hour per IP                                    │
│ ├─ Input: { email, password, fullName, ... emailVerified }    │
│ ├─ Output: { message, user {...} }                            │
│ └─ Side: Creates user account, emits socket event             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

*Diagram last updated: 2024-12-25*
