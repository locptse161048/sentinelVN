    const express = require('express');
    const router = express.Router();
    const TrialContact = require('../models/trialContact');
    const adminMiddleware = require('../middleware/adminMiddleware');


    // Guest gửi yêu cầu dùng thử
    router.post('/trial-contact', async (req, res) => {
        try {
            const { name, email, message } = req.body;
            if (!name || !email || !message) {
                return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
            }
            const trialContact = await TrialContact.create({ name, email, message });
            
            // ✅ Emit socket event to notify admin of new trial contact
            const io = req.app.locals.io;
            if (io) {
                io.emit('new_trial_contact', {
                    _id: trialContact._id,
                    name: trialContact.name,
                    email: trialContact.email,
                    message: trialContact.message,
                    status: trialContact.status || 'pending',
                    createdAt: trialContact.createdAt
                });
                console.log('[SOCKET] Emitted new_trial_contact event');
            }
            
            res.json({ success: true });
        } catch (err) {
            console.error('Error saving trial contact:', err);
            res.status(500).json({ message: 'Lỗi server.' });
        }
    });
    
    // ⚠️ SECURITY: Admin only - requires adminMiddleware
    router.patch('/trial-contact/:id', adminMiddleware, async (req, res) => {
        try {
            const { status } = req.body;
            await TrialContact.findByIdAndUpdate(req.params.id, { status });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ message: 'Lỗi server.' });
        }
    });
    
    // Admin xem danh sách
    router.get('/trial-contacts', adminMiddleware, async (req, res) => {
        try {
            const contacts = await TrialContact.find().sort({ createdAt: -1 });
            res.json(contacts);
        } catch (err) {
            res.status(500).json({ message: 'Lỗi server.' });
        }
    });
    module.exports = router;
