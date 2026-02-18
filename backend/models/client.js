const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
	email: { type: String, required: true, unique: true },
	passwordHash: { type: String, required: true },
	name: { type: String },
	isAdmin: { type: Boolean, default: false },
	createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Client', ClientSchema);
