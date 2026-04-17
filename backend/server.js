require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
dotenv.config();
const session = require("express-session");
const MongoStore = require('connect-mongo').default;
// ⚠️ SECURITY: Rate limiting to prevent brute force
const rateLimit = require('express-rate-limit');
const app = express();

// 🔍 DEBUG: Check environment
// In production, allow all origins temporarily for debugging cookie/session issues
const isDevelopment = process.env.NODE_ENV !== 'production' || process.env.ALLOW_ALL_ORIGINS === 'true';
console.log(`[STARTUP] NODE_ENV: "${process.env.NODE_ENV}"`);
console.log(`[STARTUP] isDevelopment: ${isDevelopment} (will allow all origins)`);
console.log(`[STARTUP] ALLOW_ALL_ORIGINS: ${process.env.ALLOW_ALL_ORIGINS || 'not set'}`);

// Create HTTP server for socket.io
const httpServer = http.createServer(app);
// CORS configuration - allow more origins in development
const allowedOrigins = [
  "https://sentinelvn-one.vercel.app",   // Main Vercel frontend
  "https://sentinelvn.vercel.app",       // Alternative Vercel domain
  "https://*.vercel.app",                // Any Vercel preview deployment
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, file://, or curl)
    if (!origin) {
      console.log('[CORS] ✅ No origin (mobile/curl)');
      return callback(null, true);
    }
    
    // 🔍 DEBUG: Log all origins attempting to access
    console.log(`[CORS] 🔍 Incoming origin: ${origin}`);
    
    // ✅ In development, allow ALL origins (temporary for debugging)
    if (isDevelopment) {
      console.log(`[CORS] 🟡 Development mode: allowing all origins`);
      return callback(null, true);
    }
    
    // ✅ Production: Strict origin checking
    // Check against allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        // Handle wildcard like https://*.vercel.app
        const pattern = allowed.replace('*.', '.*\\.').replace(/\./g, '\\.');
        return new RegExp(`^https://${pattern}$`).test(origin);
      }
      return allowed === origin;
    });
    
    // Also allow Vercel and Render domains dynamically
    const isVercelOrRender = origin.includes('vercel.app') || 
                             origin.includes('render.com') ||
                             origin.includes('github.dev');
    
    if (isAllowed || isVercelOrRender) {
      console.log(`[CORS] ✅ Origin allowed: ${origin}`);
      return callback(null, true);
    }
    
    // ⚠️ Log rejected origins for debugging
    console.warn('[CORS] ❌ Rejected origin:', origin);
    console.warn('[CORS] ❌ Allowed list:', allowedOrigins);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
}));

// ✅ Socket.io configuration with CORS support
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      // ✅ In development, allow ALL origins
      if (isDevelopment) {
        console.log(`[SOCKET.IO CORS] 🟡 Development mode: allowing origin: ${origin}`);
        return callback(null, true);
      }
      
      if (origin.includes('localhost') || 
          origin.includes('127.0.0.1') || 
          origin.includes('vercel.app') ||
          origin.includes('render.com') ||
          allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn('[SOCKET.IO CORS] Rejected origin:', origin);
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Export io for use in routes
app.locals.io = io;
app.set("trust proxy", 1);

// ✅ Force production cookie settings on Render/Vercel (HTTPS by default)
// Always use secure cross-origin cookie settings in non-localhost environments
const isLocalhost = process.env.NODE_ENV === 'development' || 
                    process.env.HOST === 'localhost' ||
                    !process.env.NODE_ENV;

const cookieSettings = {
  httpOnly: true,
  maxAge: 60 * 60 * 1000, // 1 hour
  proxy: true
};

// ✅ On production/hosting (Render, Vercel, etc), use strict cookie settings
// On localhost, use relaxed settings
if (!isLocalhost) {
  // Production: require HTTPS for cross-origin cookies
  cookieSettings.secure = true;
  cookieSettings.sameSite = 'none';
  console.log('[STARTUP] ✅ Production cookie config (secure + sameSite:none)');
} else {
  // Local development: HTTP is OK
  cookieSettings.secure = false;
  cookieSettings.sameSite = 'lax';
  console.log('[STARTUP] ✅ Development cookie config (non-secure + sameSite:lax)');
}

// ✅ Initialize MongoDB session store BEFORE app.use()
let sessionStore;
try {
  sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/sentinelVN',
    touchAfter: 24 * 3600, // Lazy session update (every 24h)
    stringify: false
  });
  sessionStore.on('error', (err) => {
    console.error('[SESSION STORE] Error:', err);
  });
  console.log('[STARTUP] ✅ MongoDB session store initialized');
} catch (err) {
  console.error('[STARTUP] ❌ Failed to initialize session store:', err);
}

app.use(session({
  name: "sentinel_session",
  secret: process.env.SESSION_SECRET || "supersecret",
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: cookieSettings
}));

// ✅ Export session store to app.locals so routes can access it
app.locals.sessionStore = sessionStore;
console.log('[STARTUP] ✅ Session store exported to app.locals');

// ⚠️ SECURITY: Rate limiting on auth endpoints (prevent brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.',
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 registrations per hour
  message: 'Quá nhiều lần đăng ký. Vui lòng thử lại sau 1 giờ.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(bodyParser.json());

// ✅ Ensure CORS credentials header is set on all responses
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Content-Type, Authorization');
  }
  next();
});

// ✅ Debug middleware to log session info for every request
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/admin')) {
    console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log(`  🌐 Origin: ${req.get('origin')}`);
    console.log(`  🔗 Host: ${req.get('host')}`);
    console.log(`  📗 SessionID: ${req.sessionID}`);
    console.log(`  💾 Session.userId: ${req.session?.userId || 'undefined'}`);
    console.log(`  💾 Session.role: ${req.session?.role || 'undefined'}`);
    console.log(`  🍪 Request Cookies:`, req.headers.cookie ? req.headers.cookie.substring(0, 50) + '...' : 'MISSING ⚠️');
    console.log(`  📝 Request Headers keys:`, Object.keys(req.headers).join(', '));
  }
  next();
});

// Database
const db = require('./config/db');
db.connect();

// Middleware
const authMiddleware = require('./middleware/authMiddleware');
const adminMiddleware = require('./middleware/adminMiddleware');

// Routes - Export limiters for auth routes
app.locals.loginLimiter = loginLimiter;
app.locals.registerLimiter = registerLimiter;

const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);
console.log("[STARTUP] ✅ /api/auth mounted with rate limiting");

// Extension routes (JWT-based, no cookie needed)
app.use('/api/ext', require('./routes/ext.routes'));
console.log("[STARTUP] ✅ /api/ext mounted (JWT auth for VS Code extension)");

app.use('/api/admin', adminMiddleware, require('./routes/admin.routes'));
console.log("[STARTUP] ✅ /api/admin mounted");

app.use('/api/client', authMiddleware, require('./routes/client.routes'));
console.log("[STARTUP] ✅ /api/client mounted (with authMiddleware)");

app.use('/api/team', authMiddleware, require('./routes/team.routes'));
console.log("[STARTUP] ✅ /api/team mounted (with authMiddleware)");

app.use('/api/payment', authMiddleware, require('./routes/payment.routes'));
console.log("[STARTUP] ✅ /api/payment mounted (with authMiddleware)");

app.use('/api/support', authMiddleware, require('./routes/support.routes'));
console.log("[STARTUP] ✅ /api/support mounted (with authMiddleware)");

app.use('/api/webhook', require('./routes/webhook.routes'));
console.log("[STARTUP] ✅ /api/webhook mounted");
app.use('/api', require('./routes/trialContact.routes'));
console.log("[STARTUP] ✅ /api/trial-contact mounted");
app.get('/', (req, res) => {
  res.send('Sentinel VN Backend API');
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`[STARTUP] ✅ WebSocket (socket.io) initialized`);
});
app.get("/test", (req, res) => {
  res.json({
    message: "Backend đang hoạt động 🚀"
  });
});

app.get("/create-user", async (req, res) => {
  try {
    const Client = require("./models/client");

    const user = await Client.create({
      email: "admin@admin.com",
      fullName: "admin",
      passwordHash: "ThisisAdmin",
      isAdmin: true,
    });

    res.json(user);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});
