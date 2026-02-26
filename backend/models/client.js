const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
	email: { type: String, required: true, unique: true },
	passwordHash: { type: String, required: true },
	fullName: { type: String, required: true },
	role: { type: String, enum: ['client', 'admin'], default: 'client' },
	status: { type: String, enum: ['đang hoạt động', 'tạm ngưng'], default: 'đang hoạt động' },
	createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Client', ClientSchema);
