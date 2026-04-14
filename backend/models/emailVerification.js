const mongoose = require('mongoose');

const EmailVerificationSchema = new mongoose.Schema({
	email: { type: String, required: true, index: true },
	otpHash: { type: String, required: true }, // Hashed OTP
	attempts: { type: Number, default: 0 }, // Count of failed OTP attempts
	resendCount: { type: Number, default: 0 }, // Count of resend requests
	lastResendTime: { type: Date, default: null }, // Timestamp of last resend
	createdAt: { type: Date, default: Date.now },
	expireAt: { type: Date, required: true } // Explicit expiration time for TTL
});

// ✅ TTL Index: Auto-delete document 2 minutes after creation
// MongoDB will check this index every 60 seconds and delete expired docs
EmailVerificationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// ✅ Email index for faster queries
EmailVerificationSchema.index({ email: 1 });

module.exports = mongoose.model('EmailVerification', EmailVerificationSchema);
