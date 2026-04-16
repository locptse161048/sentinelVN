const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
	email: { type: String, required: true, unique: true },
	passwordHash: { type: String, required: true },
	fullName: { type: String, required: true },
	firstName: { type: String, default: null },
	lastName: { type: String, default: null },
	gender: { type: String, enum: ['nam', 'nữ', 'khác'], default: null },
	dateOfBirth: { type: Date, default: null },
	phone: { type: String, default: null },
	city: { type: String, default: null },
	phoneVerified: { type: Boolean, default: false },
	role: { type: String, enum: ['client', 'admin'], default: 'client' },
	status: { type: String, enum: ['đang hoạt động', 'tạm ngưng'], default: 'đang hoạt động' },
	loginAttempts: { type: Number, default: 0 },
	lastLoginAttempt: { type: Date, default: null },
	scanCount: { type: Number, default: 0 },
	scanResetDate: { type: Date, default: null },
	createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Client', ClientSchema);
