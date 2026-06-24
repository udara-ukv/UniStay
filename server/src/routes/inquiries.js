const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/inquiries - Send inquiry (student)
router.post('/', authenticate, (req, res) => {
  try {
    const { listing_id, message } = req.body;

    if (!listing_id || !message) {
      return res.status(400).json({ error: 'Listing ID and message are required.' });
    }

    const db = getDb();

    // Check listing exists and is approved
    const listing = db.prepare("SELECT * FROM listings WHERE id = ? AND status = 'approved'").get(listing_id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found or not available.' });
    }

    // Don't allow owners to inquire on their own listings
    if (listing.owner_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot inquire on your own listing.' });
    }

    const result = db.prepare(
      'INSERT INTO inquiries (student_id, listing_id, message) VALUES (?, ?, ?)'
    ).run(req.user.id, listing_id, message);

    const inquiry = db.prepare(`
      SELECT i.*, l.title as listing_title, u.name as student_name
      FROM inquiries i
      JOIN listings l ON i.listing_id = l.id
      JOIN users u ON i.student_id = u.id
      WHERE i.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(inquiry);
  } catch (err) {
    console.error('Create inquiry error:', err);
    res.status(500).json({ error: 'Failed to send inquiry.' });
  }
});

// GET /api/inquiries/sent - Student's sent inquiries
router.get('/sent', authenticate, (req, res) => {
  try {
    const db = getDb();
    const inquiries = db.prepare(`
      SELECT i.*, l.title as listing_title, l.rent, l.location, l.room_type,
        u.name as owner_name,
        (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as listing_image
      FROM inquiries i
      JOIN listings l ON i.listing_id = l.id
      JOIN users u ON l.owner_id = u.id
      WHERE i.student_id = ?
      ORDER BY i.created_at DESC
    `).all(req.user.id);

    res.json(inquiries);
  } catch (err) {
    console.error('Get sent inquiries error:', err);
    res.status(500).json({ error: 'Failed to fetch inquiries.' });
  }
});

// GET /api/inquiries/received - Owner's received inquiries
router.get('/received', authenticate, (req, res) => {
  try {
    const db = getDb();
    const inquiries = db.prepare(`
      SELECT i.*, l.title as listing_title, l.rent,
        u.name as student_name, u.email as student_email, u.phone as student_phone, u.university as student_university
      FROM inquiries i
      JOIN listings l ON i.listing_id = l.id
      JOIN users u ON i.student_id = u.id
      WHERE l.owner_id = ?
      ORDER BY i.created_at DESC
    `).all(req.user.id);

    res.json(inquiries);
  } catch (err) {
    console.error('Get received inquiries error:', err);
    res.status(500).json({ error: 'Failed to fetch inquiries.' });
  }
});

// PUT /api/inquiries/:id/respond - Owner responds
router.put('/:id/respond', authenticate, (req, res) => {
  try {
    const { status, owner_response } = req.body;

    if (!status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be accepted or rejected.' });
    }

    const db = getDb();

    // Verify ownership
    const inquiry = db.prepare(`
      SELECT i.*, l.owner_id
      FROM inquiries i
      JOIN listings l ON i.listing_id = l.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found.' });
    }
    if (inquiry.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only respond to inquiries for your listings.' });
    }

    db.prepare(
      'UPDATE inquiries SET status = ?, owner_response = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(status, owner_response || '', req.params.id);

    const updated = db.prepare(`
      SELECT i.*, l.title as listing_title, u.name as student_name
      FROM inquiries i
      JOIN listings l ON i.listing_id = l.id
      JOIN users u ON i.student_id = u.id
      WHERE i.id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (err) {
    console.error('Respond to inquiry error:', err);
    res.status(500).json({ error: 'Failed to respond.' });
  }
});

module.exports = router;
