const Client = require('../models/client');

module.exports = async (req, res, next) => {
	try {
		console.log('[ADMIN MIDDLEWARE] ▶ Protecting route:', req.path);
		
		// 🔑 Extract token from Authorization header
		const authHeader = req.get('Authorization');
		const token = authHeader && authHeader.startsWith('Bearer ') 
			? authHeader.substring(7)
			: null;
		
		console.log('[ADMIN MIDDLEWARE] ▶ Token:', token ? token.substring(0, 20) + '...' : 'missing');
		
		if (!token) {
			console.warn('[ADMIN MIDDLEWARE] ❌ No token in Authorization header');
			return res.status(401).json({ message: 'Chưa đăng nhập' });
		}
		
		// ✅ Get session store
		const sessionStore = req.app.locals.sessionStore;
		if (!sessionStore) {
			console.error('[ADMIN MIDDLEWARE] ❌ Session store not available');
			return res.status(500).json({ message: 'Lỗi server' });
		}
		
		// Query session from MongoDB
		sessionStore.get(token, async (err, sessionData) => {
			if (err) {
				console.error('[ADMIN MIDDLEWARE] ❌ Session query error:', err.message);
				return res.status(401).json({ message: 'Phiên không hợp lệ' });
			}
			
			if (!sessionData || !sessionData.userId) {
				console.warn('[ADMIN MIDDLEWARE] ❌ No session found for token');
				return res.status(401).json({ message: 'Chưa đăng nhập' });
			}
			
			try {
				const user = await Client.findById(sessionData.userId);
				
				if (!user) {
					console.warn('[ADMIN MIDDLEWARE] ❌ User not found');
					return res.status(401).json({ message: 'User không tồn tại' });
				}
				
				if (user.role !== 'admin') {
					console.warn('[ADMIN MIDDLEWARE] ❌ User is not admin:', user.role);
					return res.status(403).json({ message: 'Admin access required' });
				}
				
				console.log('[ADMIN MIDDLEWARE] ✅ Admin verified:', user.email);
				req.user = user;
				next();
			} catch (userErr) {
				console.error('[ADMIN MIDDLEWARE] ❌ User lookup error:', userErr.message);
				res.status(500).json({ message: 'Lỗi server' });
			}
		});
	} catch (err) {
		console.error('[ADMIN MIDDLEWARE] ❌ Unexpected error:', err.message);
		res.status(500).json({ message: 'Lỗi server' });
	}
};
