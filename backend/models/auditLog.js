const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
	teamLeaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
	email: { type: String, required: true },
	file: { type: String, required: true },
	action: { type: String, enum: ['upload', 'download', 'view', 'delete', 'share'], default: 'view' },
	ipAddress: { type: String, default: null },
	userAgent: { type: String, default: null },
	createdAt: { type: Date, default: Date.now },
});

// Index để query nhanh hơn
AuditLogSchema.index({ teamLeaderId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
