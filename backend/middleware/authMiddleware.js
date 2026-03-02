module.exports = (req, res, next) => {
  console.log("[AUTH MIDDLEWARE] Path:", req.path, "| Session:", req.session, "| UserId:", req.session?.userId);
  
  if (!req.session || !req.session.userId) {
    console.warn("[AUTH MIDDLEWARE] ❌ No sessionId or userId found");
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }
  
  console.log("[AUTH MIDDLEWARE] ✅ User authenticated:", req.session.userId);
  next();
};
