const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/favorites/:listingId - Toggle favorite
router.post('/:listingId', authenticate, (req, res) => {
  try {
    const db = getDb();
    const listingId = req.params.listingId;
    const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND listing_id = ?').get(req.user.id, listingId);
    if (existing) {
      db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id);
      res.json({ favorited: false, message: 'Removed from favorites.' });
    } else {
      db.prepare('INSERT INTO favorites (user_id, listing_id) VALUES (?, ?)').run(req.user.id, listingId);
      res.json({ favorited: true, message: 'Added to favorites.' });
    }
  } catch (err) {
    console.error('Toggle favorite error:', err);
    res.status(500).json({ error: 'Failed to toggle favorite.' });
  }
});

// GET /api/favorites - Get user's favorites
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const favorites = db.prepare(`
      SELECT l.*, u.name as owner_name, u.is_verified as owner_verified, f.created_at as favorited_at,
        (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image,
        (SELECT AVG(overall) FROM reviews WHERE listing_id = l.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id) as review_count,
        1 as is_favorited
      FROM favorites f
      JOIN listings l ON f.listing_id = l.id
      JOIN users u ON l.owner_id = u.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).all(req.user.id);
    const parsed = favorites.map(l => ({ ...l, facilities: JSON.parse(l.facilities || '[]'), rules: JSON.parse(l.rules || '[]'), is_favorited: true }));
    res.json(parsed);
  } catch (err) {
    console.error('Get favorites error:', err);
    res.status(500).json({ error: 'Failed to fetch favorites.' });
  }
});

module.exports = router;
