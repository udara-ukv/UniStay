-- UniStay Seed Data
-- Demo users, listings, reviews, and inquiries

-- Passwords are all 'password123' hashed with bcryptjs
-- $2a$10$rIC/KBe8R8JCxQK3xUqYQO8Z5Y0M5L5KwW5Z5K5M5L5K5M5L5K5M
-- (We'll generate proper hashes at runtime)

-- Admin user
INSERT OR IGNORE INTO users (name, email, password_hash, phone, role, is_verified, university) VALUES
('Admin User', 'admin@unistay.lk', '$2a$10$placeholder', '0771234567', 'admin', 1, 'NSBM Green University');

-- Property Owners
INSERT OR IGNORE INTO users (name, email, password_hash, phone, role, is_verified, university) VALUES
('Kamal Perera', 'kamal@example.com', '$2a$10$placeholder', '0772345678', 'owner', 1, NULL),
('Nimali Silva', 'nimali@example.com', '$2a$10$placeholder', '0773456789', 'owner', 1, NULL),
('Ruwan Fernando', 'ruwan@example.com', '$2a$10$placeholder', '0774567890', 'owner', 0, NULL);

-- Students
INSERT OR IGNORE INTO users (name, email, password_hash, phone, role, is_verified, university) VALUES
('Sahan Jayawardena', 'sahan@student.com', '$2a$10$placeholder', '0775678901', 'student', 1, 'NSBM Green University'),
('Malini Kumari', 'malini@student.com', '$2a$10$placeholder', '0776789012', 'student', 1, 'University of Colombo'),
('Tharaka Bandara', 'tharaka@student.com', '$2a$10$placeholder', '0777890123', 'student', 0, 'NSBM Green University');

-- Listings (NSBM area - Homagama/Pitipana)
INSERT OR IGNORE INTO listings (owner_id, title, description, rent, location, address, latitude, longitude, distance_from_uni, room_type, gender_pref, max_occupants, facilities, rules, status, is_verified) VALUES
(2, 'Cozy Single Room near NSBM', 'A well-furnished single room in a quiet residential area. Perfect for focused studies. The room includes a bed, study table, wardrobe, and attached bathroom. The house has a shared kitchen and common area.', 12000, 'Pitipana, Homagama', '45/2 Pitipana Road, Homagama', 6.7985, 80.0225, 1.2, 'single', 'male', 1, '["Wi-Fi", "Hot Water", "Parking", "Study Table", "Wardrobe", "Attached Bathroom"]', '["No smoking", "No pets", "Quiet after 10 PM"]', 'approved', 1),

(2, 'Spacious Shared Room - 2 Beds', 'Large shared room with two beds, ideal for students who want to split costs. Common kitchen and laundry facilities available. Close to bus route and shops.', 8000, 'Homagama', '23 Kottawa Road, Homagama', 6.8010, 80.0180, 2.5, 'shared', 'male', 2, '["Wi-Fi", "Laundry", "Kitchen", "Parking"]', '["No overnight guests", "Clean common areas"]', 'approved', 1),

(3, 'Modern Annex for Female Students', 'Brand new annex with separate entrance. Fully furnished with modern amenities. Ideal for female students seeking privacy and comfort. Includes a small pantry area and private bathroom.', 18000, 'Pitipana, Homagama', '67A Temple Road, Pitipana', 6.7950, 80.0250, 0.8, 'annex', 'female', 2, '["Wi-Fi", "Hot Water", "Air Conditioning", "Washing Machine", "CCTV", "Private Entrance"]', '["Female only", "No smoking", "Visitors until 8 PM"]', 'approved', 1),

(3, 'Budget Friendly Room near Bus Stop', 'Simple but clean room near the main bus stop. Great for students on a tight budget. Shared bathroom and kitchen. Walking distance to NSBM.', 6500, 'Homagama Town', '12 Main Street, Homagama', 6.8045, 80.0130, 3.0, 'single', 'any', 1, '["Wi-Fi", "Kitchen Access", "Near Bus Stop"]', '["Quiet hours after 9 PM", "No cooking in room"]', 'approved', 0),

(4, 'Premium House - Group Accommodation', 'Entire house available for a group of students. 4 bedrooms, 2 bathrooms, large living room, and fully equipped kitchen. Garden with parking space. Perfect for a group of friends.', 45000, 'Meegoda', '89 Colombo Road, Meegoda', 6.8100, 80.0350, 4.5, 'house', 'any', 6, '["Wi-Fi", "Hot Water", "Parking", "Garden", "Full Kitchen", "Washing Machine", "TV"]', '["No loud parties", "Maintain garden", "Share utilities equally"]', 'approved', 0),

(2, 'Quiet Study Room with AC', 'Air-conditioned single room ideal for serious students. Located in a peaceful neighborhood away from main road noise. 24/7 CCTV security.', 15000, 'Pitipana, Homagama', '34/B Green Lane, Pitipana', 6.7970, 80.0210, 1.0, 'single', 'any', 1, '["Wi-Fi", "Air Conditioning", "CCTV", "Hot Water", "Study Table", "Bookshelf"]', '["No smoking", "Quiet environment", "No pets"]', 'approved', 1),

(3, 'Girls Hostel - Shared Accommodation', 'Well-managed girls hostel with warden supervision. Includes meals (breakfast and dinner). Safe environment with CCTV and gate security.', 22000, 'Homagama', '56 Lake Road, Homagama', 6.8025, 80.0200, 2.0, 'shared', 'female', 3, '["Wi-Fi", "Meals Included", "CCTV", "Warden", "Laundry", "Hot Water"]', '["Female only", "Gate closes at 9 PM", "No male visitors"]', 'approved', 1),

(4, 'Affordable Annex with Kitchen', 'Self-contained annex with a small kitchen area. Separate water and electricity meters. Quiet area with good bus connectivity.', 14000, 'Kottawa', '78 High Level Road, Kottawa', 6.8400, 80.0100, 6.0, 'annex', 'any', 2, '["Wi-Fi", "Kitchen", "Separate Meters", "Parking"]', '["Pay own utilities", "No loud music"]', 'pending', 0),

(2, 'Luxury Room - All Inclusive', 'Premium accommodation with all amenities included in rent. Furnished to high standard with brand new furniture. Cleaning service twice a week.', 25000, 'Pitipana, Homagama', '12A University Drive, Pitipana', 6.7960, 80.0240, 0.5, 'single', 'any', 1, '["Wi-Fi", "Air Conditioning", "Hot Water", "Cleaning Service", "Meals Available", "Gym Access", "Study Room"]', '["No smoking", "No pets", "Respect quiet hours"]', 'approved', 1),

(3, 'Shared Room for Male Students', 'Clean shared room in a family house. Home-cooked meals available at extra cost. Family environment - perfect for students away from home.', 7500, 'Homagama', '45 Temple Lane, Homagama', 6.8035, 80.0155, 2.8, 'shared', 'male', 2, '["Wi-Fi", "Meals Available", "Laundry", "Family Environment"]', '["Respect family privacy", "No alcohol", "Quiet after 9:30 PM"]', 'approved', 0);

-- Reviews
INSERT OR IGNORE INTO reviews (student_id, listing_id, cleanliness, safety, internet, landlord, value_for_money, overall, comment) VALUES
(5, 1, 5, 4, 4, 5, 4, 4.4, 'Great place! Very clean and the landlord is very responsive. Wi-Fi is decent for online classes. Highly recommended for NSBM students.'),
(6, 1, 4, 5, 3, 5, 4, 4.2, 'Safe neighborhood and excellent landlord. Internet could be faster during peak hours but overall a great experience.'),
(5, 3, 5, 5, 5, 4, 3, 4.4, 'Modern and very well maintained. A bit pricey but worth it for the quality. AC works perfectly.'),
(7, 2, 3, 4, 4, 4, 5, 4.0, 'Good value for money. The shared room is spacious enough for two people. Kitchen is well equipped.'),
(6, 7, 4, 5, 4, 5, 4, 4.4, 'The hostel is very safe with the warden system. Meals are good. Feels like home away from home.');

-- Inquiries
INSERT OR IGNORE INTO inquiries (student_id, listing_id, message, status, owner_response) VALUES
(5, 3, 'Hi, I am a 2nd year IT student at NSBM. Is this annex still available? Can I visit this weekend?', 'accepted', 'Yes, it is available! You can visit on Saturday between 10 AM and 4 PM. Please call me to confirm.'),
(6, 5, 'We are a group of 4 female students looking for accommodation. Can you accommodate 4 people? What about the utility charges?', 'pending', NULL),
(7, 9, 'Is the luxury room still available for next month? I would like to know more about the cleaning service and meal options.', 'accepted', 'Yes, available from next month. Cleaning is on Tuesdays and Fridays. Meals can be arranged with the family next door for Rs. 8,000/month.');

-- Favorites
INSERT OR IGNORE INTO favorites (user_id, listing_id) VALUES
(5, 1), (5, 3), (5, 9),
(6, 3), (6, 7), (6, 5),
(7, 1), (7, 2), (7, 4);

-- Roommate profiles
INSERT OR IGNORE INTO roommate_profiles (user_id, budget_min, budget_max, sleep_schedule, study_habits, smoking, gender_pref, cleanliness_level, bio) VALUES
(5, 8000, 15000, 'normal', 'moderate', 0, 'male', 'high', 'IT undergraduate at NSBM. Looking for a clean, quiet roommate who respects shared spaces. I enjoy coding and gaming in my free time.'),
(6, 10000, 20000, 'early', 'quiet', 0, 'female', 'high', 'Engineering student. Early riser, prefer a quiet study environment. Neat and organized. Looking for a like-minded roommate.'),
(7, 6000, 12000, 'late', 'social', 0, 'male', 'medium', 'Business management student. Night owl, social person. Looking for a friendly roommate who does not mind occasional late nights.');
