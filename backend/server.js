require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
dotenv.config();
const session = require("express-session");
const MongoStore = require("connect-mongo");

const app = express();
app.use(cors({
  origin: "sentinelvn-one.vercel.app",
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET || "supersecret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI
  }),
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

app.use(bodyParser.json());

// Database
const db = require('./config/db');
db.connect();

// Middleware
const authMiddleware = require('./middleware/authMiddleware');
const adminMiddleware = require('./middleware/adminMiddleware');

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/admin', adminMiddleware, require('./routes/admin.routes'));
app.use('/api/client', authMiddleware, require('./routes/client.routes'));
app.use('/api/payment', authMiddleware, require('./routes/payment.routes'));
app.use('/api/support', authMiddleware, require('./routes/support.routes'));

app.get('/', (req, res) => {
	res.send('Sentinel VN Backend API');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
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
      email: "test@gmail.com", 
      fullName: "Test User",
      passwordHash: "123456"
    });

    res.json(user);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});
