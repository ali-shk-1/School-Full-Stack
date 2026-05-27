require('dotenv').config();
const express = require('express');
const cors    = require('cors');

//const PORT = process.env.PORT || 3000;
//app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const authRoutes      = require('./routes/auth');
const studentRoutes   = require('./routes/students');
const staffRoutes     = require('./routes/staff');
const feeRoutes       = require('./routes/fees');
const expenseRoutes   = require('./routes/expenses');
const dashboardRoutes = require('./routes/dashboard');
const errorHandler    = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

/* ── Global Middleware ─────────────────── */
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // restrict in production
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Health Check ──────────────────────── */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ── API Routes ────────────────────────── */
app.use('/api/auth',      authRoutes);
app.use('/api/students',  studentRoutes);
app.use('/api/staff',     staffRoutes);
app.use('/api/fees',      feeRoutes);
app.use('/api/expenses',  expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);

/* ── 404 Handler ───────────────────────── */
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
});

/* ── Global Error Handler (must be last) ─ */
app.use(errorHandler);

/* ── Start Server ──────────────────────── */
app.listen(PORT, () => {
  console.log(`🚀  Server running on http://localhost:${PORT}`);
  console.log(`📋  Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
