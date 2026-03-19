const jwt = require('jsonwebtoken');
const Client = require('../models/client');

const EXT_JWT_SECRET = process.env.EXT_JWT_SECRET || process.env.SESSION_SECRET || 'sentinel-ext-jwt-secret';
const EXT_JWT_EXPIRES = '7d';

/**
 * Middleware xác thực JWT cho VS Code extension.
 * Extension gửi Bearer token trong header Authorization.
 */
async function extAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'TOKEN_MISSING', message: 'Chưa đăng nhập. Vui lòng đăng nhập từ extension.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, EXT_JWT_SECRET);
    const user = await Client.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'USER_NOT_FOUND', message: 'Tài khoản không tồn tại.' });
    }
    if (user.status === 'tạm ngưng') {
      return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Tài khoản đã bị tạm ngưng.' });
    }
    req.extUser = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'TOKEN_EXPIRED', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    }
    return res.status(401).json({ error: 'TOKEN_INVALID', message: 'Token không hợp lệ.' });
  }
}

/**
 * Tạo JWT token cho extension user
 */
function generateExtToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    EXT_JWT_SECRET,
    { expiresIn: EXT_JWT_EXPIRES }
  );
}

module.exports = { extAuthMiddleware, generateExtToken, EXT_JWT_SECRET };
