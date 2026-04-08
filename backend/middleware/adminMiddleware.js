const Client = require('../models/client');

module.exports = async (req, res, next) => {
	try {
		console.log('[ADMIN MIDDLEWARE] ▶ Route:', req.path);
		console.log('[ADMIN MIDDLEWARE] ▶ SessionID:', req.sessionID);
		console.log('[ADMIN MIDDLEWARE] ▶ Session.userId:', req.session?.userId);
		
		// Nếu đã có req.user và đúng quyền admin thì cho qua luôn
		if (req.user && req.user.role === 'admin') {
			console.log('[ADMIN MIDDLEWARE] ✅ req.user already exists (admin)');
			return next();
		}
		
		// Nếu chưa có req.user, lấy từ DB theo session
		if (!req.session || !req.session.userId) {
			console.warn('[ADMIN MIDDLEWARE] ❌ No session.userId found');
			console.log('[ADMIN MIDDLEWARE] Session object:', req.session);
			return res.status(401).json({ message: 'Chưa đăng nhập' });
		}
		
		const user = await Client.findById(req.session.userId);
		console.log('[ADMIN MIDDLEWARE] ✅ User found:', user?.email, 'Role:', user?.role);
		
		if (!user) {
			console.warn('[ADMIN MIDDLEWARE] ❌ User not found in database');
			return res.status(401).json({ message: 'Người dùng không tồn tại' });
		}
		
		if (user.role !== 'admin') {
			console.warn('[ADMIN MIDDLEWARE] ❌ User is not admin, role:', user.role);
			return res.status(403).json({ message: 'Admin access required' });
		}
		
		req.user = user;
		next();
	} catch (err) {
		console.error('[ADMIN MIDDLEWARE] ❌ Error:', err.message);
		console.error('[ADMIN MIDDLEWARE] Stack:', err.stack);
		res.status(500).json({ message: 'Lỗi server' });
	}
};
