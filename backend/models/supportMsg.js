const mongoose = require('mongoose');

const SupportMsgSchema = new mongoose.Schema({
	client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
	email: { type: String, required: true },
	message: { type: String, required: true },
	createdAt: { type: Date, default: Date.now },
	status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
});

module.exports = mongoose.model('SupportMsg', SupportMsgSchema);
