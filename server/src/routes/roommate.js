const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/roommate/profile - Create/update roommate profile
router.post('/profile', authenticate, (req, res) => {
  try {
    const { budget_min, budget_max, sleep_schedule, study_habits, smoking, gender_pref, cleanliness_level, bio } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM roommate_profiles WHERE user_id = ?').get(req.user.id);
    if (existing) {
      db.prepare('UPDATE roommate_profiles SET budget_min=?, budget_max=?, sleep_schedule=?, study_habits=?, smoking=?, gender_pref=?, cleanliness_level=?, bio=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?')
        .run(budget_min, budget_max, sleep_schedule || 'normal', study_habits || 'moderate', smoking ? 1 : 0, gender_pref || 'any', cleanliness_level || 'medium', bio || '', req.user.id);
    } else {
      db.prepare('INSERT INTO roommate_profiles (user_id, budget_min, budget_max, sleep_schedule, study_habits, smoking, gender_pref, cleanliness_level, bio) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(req.user.id, budget_min, budget_max, sleep_schedule || 'normal', study_habits || 'moderate', smoking ? 1 : 0, gender_pref || 'any', cleanliness_level || 'medium', bio || '');
    }
    const profile = db.prepare('SELECT rp.*, u.name, u.university FROM roommate_profiles rp JOIN users u ON rp.user_id = u.id WHERE rp.user_id = ?').get(req.user.id);
    res.json(profile);
  } catch (err) {
    console.error('Roommate profile error:', err);
    res.status(500).json({ error: 'Failed to save profile.' });
  }
});

// GET /api/roommate/profile
router.get('/profile', authenticate, (req, res) => {
  try {
    const db = getDb();
    const profile = db.prepare('SELECT rp.*, u.name, u.university FROM roommate_profiles rp JOIN users u ON rp.user_id = u.id WHERE rp.user_id = ?').get(req.user.id);
    res.json(profile || null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get profile.' });
  }
});

// GET /api/roommate/matches - Get compatible roommates
router.get('/matches', authenticate, (req, res) => {
  try {
    const db = getDb();
    const myProfile = db.prepare('SELECT * FROM roommate_profiles WHERE user_id = ?').get(req.user.id);
    if (!myProfile) return res.status(400).json({ error: 'Create your roommate profile first.' });

    const candidates = db.prepare('SELECT rp.*, u.name, u.university, u.avatar_url FROM roommate_profiles rp JOIN users u ON rp.user_id = u.id WHERE rp.user_id != ?').all(req.user.id);

    // Simple scoring algorithm
    const matches = candidates.map(c => {
      let score = 0;
      let maxScore = 0;

      // Budget overlap (weight: 3)
      maxScore += 3;
      if (myProfile.budget_max >= c.budget_min && myProfile.budget_min <= c.budget_max) score += 3;
      else if (Math.abs(myProfile.budget_max - c.budget_min) < 3000 || Math.abs(myProfile.budget_min - c.budget_max) < 3000) score += 1;

      // Sleep schedule (weight: 2)
      maxScore += 2;
      if (myProfile.sleep_schedule === c.sleep_schedule) score += 2;
      else if ((myProfile.sleep_schedule === 'normal' || c.sleep_schedule === 'normal')) score += 1;

      // Study habits (weight: 2)
      maxScore += 2;
      if (myProfile.study_habits === c.study_habits) score += 2;
      else if ((myProfile.study_habits === 'moderate' || c.study_habits === 'moderate')) score += 1;

      // Smoking (weight: 3)
      maxScore += 3;
      if (myProfile.smoking === c.smoking) score += 3;

      // Gender preference (weight: 2)
      maxScore += 2;
      if (myProfile.gender_pref === 'any' || c.gender_pref === 'any' || myProfile.gender_pref === c.gender_pref) score += 2;

      // Cleanliness (weight: 2)
      maxScore += 2;
      if (myProfile.cleanliness_level === c.cleanliness_level) score += 2;
      else if ((myProfile.cleanliness_level === 'medium' || c.cleanliness_level === 'medium')) score += 1;

      const compatibility = Math.round((score / maxScore) * 100);
      return { ...c, compatibility, score };
    });

    matches.sort((a, b) => b.compatibility - a.compatibility);
    res.json(matches);
  } catch (err) {
    console.error('Roommate matching error:', err);
    res.status(500).json({ error: 'Failed to find matches.' });
  }
});

module.exports = router;
