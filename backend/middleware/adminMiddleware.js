const Client = require('../models/client');

module.exports = async (req, res, next) => {
	try {
		// Nếu đã có req.user và đúng quyền admin thì cho qua luôn
		if (req.user && req.user.role === 'admin') {
			return next();
		}
		// Nếu chưa có req.user, lấy từ DB theo session
		if (!req.session || !req.session.userId) {
			return res.status(401).json({ message: 'Chưa đăng nhập' });
		}
		const user = await Client.findById(req.session.userId);
		if (!user || user.role !== 'admin') {
			return res.status(403).json({ message: 'Admin access required' });
		}
		req.user = user;
		next();
	} catch (err) {
		console.error('[ADMIN MIDDLEWARE] Error:', err);
		res.status(500).json({ message: 'Lỗi server' });
	}
};
