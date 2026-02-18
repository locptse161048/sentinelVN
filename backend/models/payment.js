const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
	client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
	amount: { type: Number, required: true },
	date: { type: Date, default: Date.now },
	description: { type: String },
});

module.exports = mongoose.model('Payment', PaymentSchema);
