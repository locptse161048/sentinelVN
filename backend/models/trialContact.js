const mongoose = require('mongoose');

const TrialContactSchema = new mongoose.Schema({
    name:      { type: String, required: true },
    email:     { type: String, required: true },
    message:   { type: String, required: true },
    status:    { type: String, enum: ['pending', 'resolved'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TrialContact', TrialContactSchema);