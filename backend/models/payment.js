const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
	clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
	plan: { type: String, enum: ['PREMIUM', 'PRO'], required: true },
	amount: { type: Number, required: true },
	method: { type: String, enum: ['VNPay', 'Momo', 'PayOS'], required: true },
	status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
	transactionId: { type: String, unique: true },
	createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Payment', PaymentSchema);
