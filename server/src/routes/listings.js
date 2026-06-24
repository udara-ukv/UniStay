const express = require('express');
const multer = require('multer');
const path = require('path');
const { getDb } = require('../config/database');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP images are allowed.'));
    }
  }
});

// GET /api/listings - Get all approved listings (paginated)
router.get('/', optionalAuth, (req, res) => {
  try {
    const db = getDb();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const sort = req.query.sort || 'newest';

    let orderBy = 'l.created_at DESC';
    if (sort === 'price_low') orderBy = 'l.rent ASC';
    if (sort === 'price_high') orderBy = 'l.rent DESC';
    if (sort === 'nearest') orderBy = 'l.distance_from_uni ASC';
    if (sort === 'rating') orderBy = 'avg_rating DESC';

    const countResult = db.prepare(
      "SELECT COUNT(*) as total FROM listings WHERE status = 'approved'"
    ).get();

    const listings = db.prepare(`
      SELECT l.*, u.name as owner_name, u.phone as owner_phone, u.is_verified as owner_verified,
        (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image,
        (SELECT COUNT(*) FROM listing_images WHERE listing_id = l.id) as image_count,
        (SELECT AVG(overall) FROM reviews WHERE listing_id = l.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id) as review_count
        ${req.user ? `, (SELECT COUNT(*) FROM favorites WHERE listing_id = l.id AND user_id = ${req.user.id}) as is_favorited` : ', 0 as is_favorited'}
      FROM listings l
      JOIN users u ON l.owner_id = u.id
      WHERE l.status = 'approved'
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    // Parse JSON fields
    const parsed = listings.map(l => ({
      ...l,
      facilities: JSON.parse(l.facilities || '[]'),
      rules: JSON.parse(l.rules || '[]'),
      is_favorited: !!l.is_favorited
    }));

    res.json({
      listings: parsed,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (err) {
    console.error('Get listings error:', err);
    res.status(500).json({ error: 'Failed to fetch listings.' });
  }
});

// GET /api/listings/my - Get owner's own listings
router.get('/my', authenticate, (req, res) => {
  try {
    const db = getDb();
    const listings = db.prepare(`
      SELECT l.*,
        (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image,
        (SELECT COUNT(*) FROM listing_images WHERE listing_id = l.id) as image_count,
        (SELECT AVG(overall) FROM reviews WHERE listing_id = l.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id) as review_count,
        (SELECT COUNT(*) FROM inquiries WHERE listing_id = l.id) as inquiry_count
      FROM listings l
      WHERE l.owner_id = ?
      ORDER BY l.created_at DESC
    `).all(req.user.id);

    const parsed = listings.map(l => ({
      ...l,
      facilities: JSON.parse(l.facilities || '[]'),
      rules: JSON.parse(l.rules || '[]')
    }));

    res.json(parsed);
  } catch (err) {
    console.error('Get my listings error:', err);
    res.status(500).json({ error: 'Failed to fetch your listings.' });
  }
});

// GET /api/listings/:id - Get single listing
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const db = getDb();
    const listing = db.prepare(`
      SELECT l.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email,
        u.is_verified as owner_verified, u.avatar_url as owner_avatar, u.created_at as owner_since,
        (SELECT AVG(overall) FROM reviews WHERE listing_id = l.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id) as review_count
        ${req.user ? `, (SELECT COUNT(*) FROM favorites WHERE listing_id = l.id AND user_id = ${req.user.id}) as is_favorited` : ', 0 as is_favorited'}
      FROM listings l
      JOIN users u ON l.owner_id = u.id
      WHERE l.id = ?
    `).get(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    // Get images
    const images = db.prepare(
      'SELECT * FROM listing_images WHERE listing_id = ? ORDER BY sort_order'
    ).all(listing.id);

    // Get reviews
    const reviews = db.prepare(`
      SELECT r.*, u.name as reviewer_name, u.avatar_url as reviewer_avatar
      FROM reviews r
      JOIN users u ON r.student_id = u.id
      WHERE r.listing_id = ?
      ORDER BY r.created_at DESC
    `).all(listing.id);

    // Increment view count
    db.prepare('UPDATE listings SET views_count = views_count + 1 WHERE id = ?').run(listing.id);

    res.json({
      ...listing,
      facilities: JSON.parse(listing.facilities || '[]'),
      rules: JSON.parse(listing.rules || '[]'),
      is_favorited: !!listing.is_favorited,
      images,
      reviews
    });
  } catch (err) {
    console.error('Get listing error:', err);
    res.status(500).json({ error: 'Failed to fetch listing.' });
  }
});

// POST /api/listings - Create listing
router.post('/', authenticate, requireRole('owner', 'admin'), upload.array('images', 10), (req, res) => {
  try {
    const db = getDb();
    const {
      title, description, rent, location, address,
      latitude, longitude, distance_from_uni,
      room_type, gender_pref, max_occupants,
      facilities, rules
    } = req.body;

    if (!title || !rent || !location) {
      return res.status(400).json({ error: 'Title, rent, and location are required.' });
    }

    const result = db.prepare(`
      INSERT INTO listings (owner_id, title, description, rent, location, address, latitude, longitude, distance_from_uni, room_type, gender_pref, max_occupants, facilities, rules, status, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+30 days'))
    `).run(
      req.user.id, title, description || '', parseFloat(rent), location, address || '',
      parseFloat(latitude) || null, parseFloat(longitude) || null,
      parseFloat(distance_from_uni) || null,
      room_type || 'single', gender_pref || 'any', parseInt(max_occupants) || 1,
      typeof facilities === 'string' ? facilities : JSON.stringify(facilities || []),
      typeof rules === 'string' ? rules : JSON.stringify(rules || []),
      req.user.role === 'admin' ? 'approved' : 'pending'
    );

    const listingId = result.lastInsertRowid;

    // Save uploaded images
    if (req.files && req.files.length > 0) {
      const insertImage = db.prepare(
        'INSERT INTO listing_images (listing_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)'
      );
      req.files.forEach((file, index) => {
        insertImage.run(listingId, `/uploads/${file.filename}`, index === 0 ? 1 : 0, index);
      });
    }

    const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId);
    const images = db.prepare('SELECT * FROM listing_images WHERE listing_id = ?').all(listingId);

    res.status(201).json({
      ...listing,
      facilities: JSON.parse(listing.facilities || '[]'),
      rules: JSON.parse(listing.rules || '[]'),
      images
    });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ error: 'Failed to create listing.' });
  }
});

// PUT /api/listings/:id - Update listing
router.put('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }
    if (listing.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own listings.' });
    }

    const { title, description, rent, location, address, latitude, longitude, distance_from_uni, room_type, gender_pref, max_occupants, facilities, rules } = req.body;

    db.prepare(`
      UPDATE listings SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        rent = COALESCE(?, rent),
        location = COALESCE(?, location),
        address = COALESCE(?, address),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        distance_from_uni = COALESCE(?, distance_from_uni),
        room_type = COALESCE(?, room_type),
        gender_pref = COALESCE(?, gender_pref),
        max_occupants = COALESCE(?, max_occupants),
        facilities = COALESCE(?, facilities),
        rules = COALESCE(?, rules),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title, description, rent ? parseFloat(rent) : null, location, address,
      latitude ? parseFloat(latitude) : null, longitude ? parseFloat(longitude) : null,
      distance_from_uni ? parseFloat(distance_from_uni) : null,
      room_type, gender_pref, max_occupants ? parseInt(max_occupants) : null,
      facilities ? (typeof facilities === 'string' ? facilities : JSON.stringify(facilities)) : null,
      rules ? (typeof rules === 'string' ? rules : JSON.stringify(rules)) : null,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
    res.json({
      ...updated,
      facilities: JSON.parse(updated.facilities || '[]'),
      rules: JSON.parse(updated.rules || '[]')
    });
  } catch (err) {
    console.error('Update listing error:', err);
    res.status(500).json({ error: 'Failed to update listing.' });
  }
});

// DELETE /api/listings/:id
router.delete('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }
    if (listing.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own listings.' });
    }

    db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id);
    res.json({ message: 'Listing deleted successfully.' });
  } catch (err) {
    console.error('Delete listing error:', err);
    res.status(500).json({ error: 'Failed to delete listing.' });
  }
});

module.exports = router;
