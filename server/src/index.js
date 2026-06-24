const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { getDb, closeDb } = require('./config/database');

// Route imports
const authRoutes = require('./routes/auth');
const listingsRoutes = require('./routes/listings');
const searchRoutes = require('./routes/search');
const inquiriesRoutes = require('./routes/inquiries');
const reviewsRoutes = require('./routes/reviews');
const favoritesRoutes = require('./routes/favorites');
const adminRoutes = require('./routes/admin');
const roommateRoutes = require('./routes/roommate');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files - serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Initialize database
getDb();
console.log('📦 Database initialized');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/inquiries', inquiriesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/roommate', roommateRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'UniStay API', version: '1.0.0' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.message && err.message.includes('Only JPG')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error.' });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🏠 ═══════════════════════════════════════');
  console.log('   UniStay API Server');
  console.log(`   Running on http://localhost:${PORT}`);
  console.log('   API Base: /api');
  console.log('🏠 ═══════════════════════════════════════');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});
