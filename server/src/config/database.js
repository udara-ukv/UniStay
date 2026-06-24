const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', '..', 'database', 'unistay.db');
const SCHEMA_PATH = path.join(__dirname, '..', '..', 'database', 'schema.sql');
const SEED_PATH = path.join(__dirname, '..', '..', 'database', 'seed.sql');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDatabase();
  }
  return db;
}

function initializeDatabase() {
  // Run schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  // Check if we need to seed
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    seedDatabase();
  }
}

function seedDatabase() {
  console.log('🌱 Seeding database with demo data...');
  
  // Hash the default password
  const passwordHash = bcrypt.hashSync('password123', 10);
  
  // Read seed SQL and replace placeholder hashes
  let seedSql = fs.readFileSync(SEED_PATH, 'utf8');
  seedSql = seedSql.replace(/\$2a\$10\$placeholder/g, passwordHash);
  
  db.exec(seedSql);
  console.log('✅ Database seeded successfully!');
  console.log('   Demo accounts:');
  console.log('   - Admin:   admin@unistay.lk / password123');
  console.log('   - Owner:   kamal@example.com / password123');
  console.log('   - Student: sahan@student.com / password123');
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
