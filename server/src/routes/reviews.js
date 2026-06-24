const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/reviews
router.post('/', authenticate, (req, res) => {
  try {
    const { listing_id, cleanliness, safety, internet, landlord, value_for_money, comment } = req.body;
    if (!listing_id || !cleanliness || !safety || !internet || !landlord || !value_for_money) {
      return res.status(400).json({ error: 'All rating fields are required.' });
    }
    const ratings = [cleanliness, safety, internet, landlord, value_for_money];
    if (ratings.some(r => r < 1 || r > 5)) {
      return res.status(400).json({ error: 'Ratings must be between 1 and 5.' });
    }
    const overall = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const db = getDb();
    const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listing_id);
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });
    if (listing.owner_id === req.user.id) return res.status(400).json({ error: 'Cannot review own listing.' });
    const existing = db.prepare('SELECT id FROM reviews WHERE student_id = ? AND listing_id = ?').get(req.user.id, listing_id);
    if (existing) return res.status(409).json({ error: 'Already reviewed.' });
    const result = db.prepare(
      'INSERT INTO reviews (student_id, listing_id, cleanliness, safety, internet, landlord, value_for_money, overall, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, listing_id, cleanliness, safety, internet, landlord, value_for_money, overall, comment || '');
    const review = db.prepare('SELECT r.*, u.name as reviewer_name FROM reviews r JOIN users u ON r.student_id = u.id WHERE r.id = ?').get(result.lastInsertRowid);
    res.status(201).json(review);
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ error: 'Failed to add review.' });
  }
});

// GET /api/reviews/listing/:listingId
router.get('/listing/:listingId', (req, res) => {
  try {
    const db = getDb();
    const reviews = db.prepare('SELECT r.*, u.name as reviewer_name FROM reviews r JOIN users u ON r.student_id = u.id WHERE r.listing_id = ? ORDER BY r.created_at DESC').all(req.params.listingId);
    const stats = db.prepare('SELECT AVG(overall) as avg_overall, AVG(cleanliness) as avg_cleanliness, AVG(safety) as avg_safety, AVG(internet) as avg_internet, AVG(landlord) as avg_landlord, AVG(value_for_money) as avg_value, COUNT(*) as total FROM reviews WHERE listing_id = ?').get(req.params.listingId);
    res.json({ reviews, stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

module.exports = router;
