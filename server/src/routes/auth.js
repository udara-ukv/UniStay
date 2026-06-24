const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { authenticate, generateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { name, email, password, phone, role, university } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (role && !['student', 'owner'].includes(role)) {
      return res.status(400).json({ error: 'Role must be student or owner.' });
    }

    const db = getDb();

    // Check if email exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    // Insert user
    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash, phone, role, university) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, email, passwordHash, phone || null, role || 'student', university || null);

    const user = db.prepare('SELECT id, name, email, role, is_verified, university, avatar_url, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    // Don't send password hash
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare(
      'SELECT id, name, email, phone, role, avatar_url, is_verified, university, bio, created_at FROM users WHERE id = ?'
    ).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json(user);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to get profile.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, (req, res) => {
  try {
    const { name, phone, university, bio } = req.body;
    const db = getDb();

    db.prepare(
      'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), university = COALESCE(?, university), bio = COALESCE(?, bio), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(name, phone, university, bio, req.user.id);

    const user = db.prepare(
      'SELECT id, name, email, phone, role, avatar_url, is_verified, university, bio, created_at FROM users WHERE id = ?'
    ).get(req.user.id);

    res.json(user);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

module.exports = router;
