const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/listings/pending
router.get('/listings/pending', authenticate, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const listings = db.prepare(`
      SELECT l.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone,
        (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image,
        (SELECT COUNT(*) FROM listing_images WHERE listing_id = l.id) as image_count
      FROM listings l JOIN users u ON l.owner_id = u.id
      WHERE l.status = 'pending' ORDER BY l.created_at ASC
    `).all();
    res.json(listings.map(l => ({ ...l, facilities: JSON.parse(l.facilities || '[]'), rules: JSON.parse(l.rules || '[]') })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending listings.' });
  }
});

// PUT /api/admin/listings/:id/approve
router.put('/listings/:id/approve', authenticate, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    db.prepare("UPDATE listings SET status = 'approved', is_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.json({ message: 'Listing approved.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve listing.' });
  }
});

// PUT /api/admin/listings/:id/reject
router.put('/listings/:id/reject', authenticate, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    db.prepare("UPDATE listings SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.json({ message: 'Listing rejected.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject listing.' });
  }
});

// GET /api/admin/analytics
router.get('/analytics', authenticate, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get().count;
    const totalOwners = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'owner'").get().count;
    const totalListings = db.prepare('SELECT COUNT(*) as count FROM listings').get().count;
    const approvedListings = db.prepare("SELECT COUNT(*) as count FROM listings WHERE status = 'approved'").get().count;
    const pendingListings = db.prepare("SELECT COUNT(*) as count FROM listings WHERE status = 'pending'").get().count;
    const totalReviews = db.prepare('SELECT COUNT(*) as count FROM reviews').get().count;
    const totalInquiries = db.prepare('SELECT COUNT(*) as count FROM inquiries').get().count;
    const pendingInquiries = db.prepare("SELECT COUNT(*) as count FROM inquiries WHERE status = 'pending'").get().count;
    const totalReports = db.prepare('SELECT COUNT(*) as count FROM reports').get().count;
    const avgRent = db.prepare("SELECT AVG(rent) as avg FROM listings WHERE status = 'approved'").get().avg;
    const recentListings = db.prepare("SELECT l.*, u.name as owner_name FROM listings l JOIN users u ON l.owner_id = u.id ORDER BY l.created_at DESC LIMIT 5").all();
    const recentUsers = db.prepare("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5").all();

    res.json({
      users: { total: totalUsers, students: totalStudents, owners: totalOwners },
      listings: { total: totalListings, approved: approvedListings, pending: pendingListings },
      reviews: { total: totalReviews },
      inquiries: { total: totalInquiries, pending: pendingInquiries },
      reports: { total: totalReports },
      avgRent: Math.round(avgRent || 0),
      recentListings: recentListings.map(l => ({ ...l, facilities: JSON.parse(l.facilities || '[]') })),
      recentUsers
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

// GET /api/admin/users
router.get('/users', authenticate, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare('SELECT id, name, email, phone, role, is_verified, university, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// GET /api/admin/reports
router.get('/reports', authenticate, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const reports = db.prepare('SELECT r.*, u.name as reporter_name, l.title as listing_title FROM reports r JOIN users u ON r.reporter_id = u.id JOIN listings l ON r.listing_id = l.id ORDER BY r.created_at DESC').all();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

module.exports = router;
