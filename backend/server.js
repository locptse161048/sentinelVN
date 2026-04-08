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

// Create HTTP server for socket.io
const httpServer = http.createServer(app);
// CORS configuration - allow more origins in development
const allowedOrigins = [
  "https://sentinelvn-one.vercel.app",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:5173", // Vite
  "http://127.0.0.1:5173",
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, file://, or curl)
    if (!origin) {
      return callback(null, true);
    }
    // ✅ Allow localhost AND production Vercel domain
    if (origin.includes('localhost') || 
        origin.includes('127.0.0.1') || 
        origin.includes('vercel.app') ||
        allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Log suspicious origins
    console.warn('[CORS] Rejected origin:', origin);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Socket.io configuration with CORS support
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin.includes('localhost') || 
          origin.includes('127.0.0.1') || 
          origin.includes('vercel.app') ||
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

app.use(session({
  name: "sentinel_session",
  secret: process.env.SESSION_SECRET || "supersecret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI
  }),
  cookie: cookieSettings
}));

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
