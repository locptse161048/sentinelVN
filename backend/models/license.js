const mongoose = require('mongoose');

const LicenseSchema = new mongoose.Schema({
	id: { type: String, unique: true, required: true },
	clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
	key: { type: String, unique: true, required: true },
	plan: { type: String, enum: ['PREMIUM', 'PRO'], required: true },
	amount: { type: Number, required: true },
	status: { type: String, enum: ['active', 'expired'], default: 'active' },
	createdAt: { type: Date, default: Date.now },
	expiresAt: { type: Date, required: true },
});

// Tự động cập nhật status dựa trên expiresAt
LicenseSchema.virtual('isExpired').get(function () {
	return new Date() > this.expiresAt;
});

module.exports = mongoose.model('License', LicenseSchema);