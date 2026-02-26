const mongoose = require('mongoose');

const LicenseSchema = new mongoose.Schema({
	id: { type: String, unique: true, required: true },
	clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
	key: { type: String, unique: true, required: true },
	plan: { type: String, enum: ['PREMIUM', 'PRO'], required: true },
	ammount: { type: Number, required: true },
	createdAt: { type: Date, default: Date.now },
	expiresAt: { type: Date, required: true },
});

module.exports = mongoose.model('License', LicenseSchema);
