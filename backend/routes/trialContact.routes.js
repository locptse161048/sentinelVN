const TrialContact = require('../models/trialContact');

// Guest gửi yêu cầu dùng thử
router.post('/trial-contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
        }
        await TrialContact.create({ name, email, message });
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving trial contact:', err);
        res.status(500).json({ message: 'Lỗi server.' });
    }
});

// Admin xem danh sách
router.get('/trial-contacts', async (req, res) => {
    try {
        const contacts = await TrialContact.find().sort({ createdAt: -1 });
        res.json(contacts);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server.' });
    }
});