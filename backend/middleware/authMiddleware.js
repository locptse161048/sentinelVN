const Client = require('../models/client');

module.exports = async (req, res, next) => {
	try {
		console.log('[AUTH MIDDLEWARE] ▶ Protecting route:', req.path);
		
		// 🔑 Extract token from Authorization header
		const authHeader = req.get('Authorization');
		const token = authHeader && authHeader.startsWith('Bearer ') 
			? authHeader.substring(7)
			: null;
		
		console.log('[AUTH MIDDLEWARE] ▶ Token:', token ? token.substring(0, 20) + '...' : 'missing');
		
		if (!token) {
			console.warn('[AUTH MIDDLEWARE] ❌ No token in Authorization header');
			return res.status(401).json({ message: 'Chưa đăng nhập' });
		}
		
		// ✅ Get session store
		const sessionStore = req.app.locals.sessionStore;
		if (!sessionStore) {
			console.error('[AUTH MIDDLEWARE] ❌ Session store not available');
			return res.status(500).json({ message: 'Lỗi server' });
		}
		
		// Query session from MongoDB
		sessionStore.get(token, async (err, sessionData) => {
			if (err) {
				console.error('[AUTH MIDDLEWARE] ❌ Session query error:', err.message);
				return res.status(401).json({ message: 'Phiên không hợp lệ' });
			}
			
			if (!sessionData || !sessionData.userId) {
				console.warn('[AUTH MIDDLEWARE] ❌ No session found for token');
				return res.status(401).json({ message: 'Chưa đăng nhập' });
			}
			
			try {
				const user = await Client.findById(sessionData.userId);
				
				if (!user) {
					console.warn('[AUTH MIDDLEWARE] ❌ User not found');
					return res.status(401).json({ message: 'Người dùng không tồn tại' });
				}
				
				console.log('[AUTH MIDDLEWARE] ✅ User verified:', user.email);
				req.user = user;
				req.session = sessionData;
				next();
			} catch (userErr) {
				console.error('[AUTH MIDDLEWARE] ❌ User lookup error:', userErr.message);
				res.status(500).json({ message: 'Lỗi server' });
			}
		});
	} catch (err) {
		console.error('[AUTH MIDDLEWARE] ❌ Unexpected error:', err.message);
		res.status(500).json({ message: 'Lỗi server' });
	}
};
