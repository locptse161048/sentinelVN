const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Client = require('../models/client');
const License = require('../models/license');
const { extAuthMiddleware, generateExtToken } = require('../middleware/extAuthMiddleware');

// ========= POST /api/ext/login =========
// Extension gọi để đăng nhập, trả JWT token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Email và mật khẩu là bắt buộc.' });
    }

    const user = await Client.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Sai email hoặc mật khẩu.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Sai email hoặc mật khẩu.' });
    }

    if (user.status === 'tạm ngưng') {
      return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Tài khoản đã bị tạm ngưng.' });
    }

    const token = generateExtToken(user);

    // Lấy license hiện tại
    const activeLicenses = await License.find({
      clientId: user._id,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });

    // Xác định plan cao nhất
    let plan = 'FREE';
    if (activeLicenses.some(l => l.plan === 'PRO')) plan = 'PRO';
    else if (activeLicenses.some(l => l.plan === 'PREMIUM')) plan = 'PREMIUM';

    res.json({
      success: true,
      token,
      user: {
        email: user.email,
        fullName: user.fullName,
        role: user.role
      },
      plan
    });
  } catch (err) {
    console.error('[EXT LOGIN] Error:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Lỗi server.' });
  }
});

// ========= GET /api/ext/entitlement =========
// Extension gọi để lấy plan, quota, features
router.get('/entitlement', extAuthMiddleware, async (req, res) => {
  try {
    const user = req.extUser;

    // Lấy tất cả license active
    const activeLicenses = await License.find({
      clientId: user._id,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });

    // Cũng check expired licenses để report
    const expiredLicenses = await License.find({
      clientId: user._id,
      $or: [
        { status: 'expired' },
        { status: 'tạm ngưng' },
        { expiresAt: { $lte: new Date() } }
      ]
    });

    // Auto-expire licenses còn active nhưng đã quá hạn
    for (const lic of activeLicenses) {
      if (new Date() > lic.expiresAt) {
        lic.status = 'expired';
        await lic.save();
      }
    }

    // Re-filter after auto-expire
    const validLicenses = activeLicenses.filter(l => new Date() <= l.expiresAt);

    // Xác định plan
    let plan = 'FREE';
    let planStatus = 'active';
    let expiresAt = null;

    if (validLicenses.some(l => l.plan === 'PRO')) {
      plan = 'PRO';
      const proLic = validLicenses.find(l => l.plan === 'PRO');
      expiresAt = proLic.expiresAt;
    } else if (validLicenses.some(l => l.plan === 'PREMIUM')) {
      plan = 'PREMIUM';
      const premLic = validLicenses.find(l => l.plan === 'PREMIUM');
      expiresAt = premLic.expiresAt;
    }

    // Nếu không có license active nhưng có expired → report expired
    if (plan === 'FREE' && expiredLicenses.length > 0) {
      const lastExpired = expiredLicenses.sort((a, b) => b.expiresAt - a.expiresAt)[0];
      if (lastExpired.status === 'tạm ngưng') {
        planStatus = 'suspended';
      } else {
        planStatus = 'expired';
      }
    }

    // Quota cho FREE plan
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const scanCount = user.scanCount || 0;
    const scanResetDate = user.scanResetDate ? new Date(user.scanResetDate) : null;

    // Reset quota nếu đã qua tháng mới
    let currentScanCount = scanCount;
    if (!scanResetDate || scanResetDate < monthStart) {
      currentScanCount = 0;
      user.scanCount = 0;
      user.scanResetDate = monthStart;
      await user.save();
    }

    // Build features theo plan
    const features = {
      maxScansPerMonth: plan === 'FREE' ? 100 : -1,
      allRules: plan !== 'FREE',
      aiAnalysis: plan !== 'FREE',
      sarifExport: plan !== 'FREE',
      htmlExport: true,
      patchSuggestions: plan !== 'FREE',
      complianceMapping: plan === 'PRO',
      teamManagement: plan === 'PRO',
      ssoScim: plan === 'PRO',
      onPrem: plan === 'PRO',
      prioritySupport: plan === 'PRO'
    };

    res.json({
      plan,
      status: planStatus,
      expiresAt,
      quota: {
        used: currentScanCount,
        limit: features.maxScansPerMonth,
        resetDate: monthEnd.toISOString()
      },
      features,
      user: {
        email: user.email,
        fullName: user.fullName
      }
    });
  } catch (err) {
    console.error('[EXT ENTITLEMENT] Error:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Lỗi server.' });
  }
});

// ========= POST /api/ext/usage =========
// Extension gọi sau mỗi lần scan để ghi nhận
router.post('/usage', extAuthMiddleware, async (req, res) => {
  try {
    const user = req.extUser;

    // Reset quota nếu tháng mới
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const scanResetDate = user.scanResetDate ? new Date(user.scanResetDate) : null;

    if (!scanResetDate || scanResetDate < monthStart) {
      user.scanCount = 0;
      user.scanResetDate = monthStart;
    }

    // Lấy plan hiện tại
    const activeLicense = await License.findOne({
      clientId: user._id,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });

    const plan = activeLicense ? activeLicense.plan : 'FREE';
    const limit = plan === 'FREE' ? 100 : -1;

    // Check quota cho FREE
    if (plan === 'FREE' && user.scanCount >= 100) {
      return res.status(429).json({
        error: 'QUOTA_EXCEEDED',
        message: 'Đã hết quota quét trong tháng. Nâng cấp lên PREMIUM để quét không giới hạn.',
        quota: {
          used: user.scanCount,
          limit: 100,
          resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
        }
      });
    }

    // Increment scan count
    user.scanCount = (user.scanCount || 0) + 1;
    await user.save();

    res.json({
      success: true,
      quota: {
        used: user.scanCount,
        limit,
        resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
      }
    });
  } catch (err) {
    console.error('[EXT USAGE] Error:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Lỗi server.' });
  }
});

// ========= POST /api/ext/refresh =========
// Refresh JWT token
router.post('/refresh', extAuthMiddleware, async (req, res) => {
  try {
    const user = req.extUser;
    const token = generateExtToken(user);
    res.json({ success: true, token });
  } catch (err) {
    console.error('[EXT REFRESH] Error:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Lỗi server.' });
  }
});

module.exports = router;
