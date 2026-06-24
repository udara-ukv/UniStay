const express = require('express');
const { getDb } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/search - Full search with filters
router.get('/', optionalAuth, (req, res) => {
  try {
    const db = getDb();
    const {
      q, rent_min, rent_max, room_type, gender_pref,
      distance_max, facilities, location,
      sort = 'newest', page = 1, limit = 12
    } = req.query;

    const conditions = ["l.status = 'approved'"];
    const params = [];

    // Text search
    if (q) {
      conditions.push('(l.title LIKE ? OR l.description LIKE ? OR l.location LIKE ? OR l.address LIKE ?)');
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Rent range
    if (rent_min) {
      conditions.push('l.rent >= ?');
      params.push(parseFloat(rent_min));
    }
    if (rent_max) {
      conditions.push('l.rent <= ?');
      params.push(parseFloat(rent_max));
    }

    // Room type
    if (room_type) {
      conditions.push('l.room_type = ?');
      params.push(room_type);
    }

    // Gender preference
    if (gender_pref) {
      conditions.push("(l.gender_pref = ? OR l.gender_pref = 'any')");
      params.push(gender_pref);
    }

    // Distance from university
    if (distance_max) {
      conditions.push('l.distance_from_uni <= ?');
      params.push(parseFloat(distance_max));
    }

    // Location
    if (location) {
      conditions.push('l.location LIKE ?');
      params.push(`%${location}%`);
    }

    // Facilities filter
    if (facilities) {
      const facilityList = facilities.split(',');
      facilityList.forEach(f => {
        conditions.push('l.facilities LIKE ?');
        params.push(`%${f.trim()}%`);
      });
    }

    const whereClause = conditions.join(' AND ');

    let orderBy = 'l.created_at DESC';
    if (sort === 'price_low') orderBy = 'l.rent ASC';
    if (sort === 'price_high') orderBy = 'l.rent DESC';
    if (sort === 'nearest') orderBy = 'l.distance_from_uni ASC';
    if (sort === 'rating') orderBy = 'avg_rating DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Count total
    const countResult = db.prepare(
      `SELECT COUNT(*) as total FROM listings l WHERE ${whereClause}`
    ).get(...params);

    // Get listings
    const listings = db.prepare(`
      SELECT l.*, u.name as owner_name, u.is_verified as owner_verified,
        (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image,
        (SELECT AVG(overall) FROM reviews WHERE listing_id = l.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id) as review_count
        ${req.user ? `, (SELECT COUNT(*) FROM favorites WHERE listing_id = l.id AND user_id = ${req.user.id}) as is_favorited` : ', 0 as is_favorited'}
      FROM listings l
      JOIN users u ON l.owner_id = u.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    const parsed = listings.map(l => ({
      ...l,
      facilities: JSON.parse(l.facilities || '[]'),
      rules: JSON.parse(l.rules || '[]'),
      is_favorited: !!l.is_favorited
    }));

    res.json({
      listings: parsed,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / parseInt(limit))
      },
      filters: { q, rent_min, rent_max, room_type, gender_pref, distance_max, location, facilities }
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed.' });
  }
});

module.exports = router;
