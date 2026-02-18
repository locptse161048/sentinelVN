const mongoose = require('mongoose');

const LicenseSchema = new mongoose.Schema({
	client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
	packageName: { type: String, required: true },
	startDate: { type: Date, default: Date.now },
	endDate: { type: Date },
	status: { type: String, enum: ['active', 'expired'], default: 'active' },
});

module.exports = mongoose.model('License', LicenseSchema);
