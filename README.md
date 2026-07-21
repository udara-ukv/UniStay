# 🏠 UniStay - Student Housing Platform

A full-stack student housing platform built to help university students find verified accommodation near their campus. Features property listings, student verification, roommate matching, and review systems.

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **Backend** | Python, FastAPI |
| **Database** | SQLite |
| **Styling** | CSS with modern design system |
| **Auth** | JWT + bcrypt |

## ✨ Features

- 🔍 **Property Search** — Filter listings by location, price, room type, and gender preference
- 🏡 **Listing Management** — Property owners can create, edit, and manage listings
- ⭐ **Reviews & Ratings** — Students can rate and review accommodations
- 💬 **Inquiries** — Direct messaging between students and property owners
- 👥 **Roommate Matching** — Find compatible roommates based on preferences
- ❤️ **Favorites** — Save and manage favorite listings
- 🔐 **Authentication** — Secure JWT-based auth with role-based access (student/owner/admin)
- ✅ **Verification** — Student and property verification system

## 📁 Project Structure

```
housing-app/
├── client/          # React + TypeScript frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.tsx
│   └── package.json
├── server/          # Python FastAPI backend
│   ├── app.py
│   ├── requirements.txt
│   ├── database/
│   │   ├── schema.sql
│   │   └── seed.sql
│   └── uploads/
└── README.md
```

## 🛠️ Getting Started

### Prerequisites

- Python 3.11+
- pip
- Node.js 18+ (for frontend)
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/udara-ukv/UniStay.git
   cd UniStay
   ```

2. **Install server dependencies**
   ```bash
   cd server
   pip install -r requirements.txt
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Database setup**
   ```
   Note: The database will be created automatically on first run.
   Sample data will be seeded automatically.
   ```

5. **Start the development servers**

   **Terminal 1 - Backend (Python FastAPI, from `/server`):**
   ```bash
   cd server
   uvicorn app:app --reload --host 0.0.0.0 --port 3001
   ```

   **Terminal 2 - Frontend (from `/client`):**
   ```bash
   cd client
   npm run dev
   ```

6. **Open the app**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - API Health Check: http://localhost:3001/api/health

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/listings` | Get all listings |
| POST | `/api/listings` | Create a listing |
| GET | `/api/listings/:id` | Get listing details |
| GET | `/api/reviews/:listingId` | Get reviews for a listing |
| POST | `/api/reviews` | Create a review |
| GET | `/api/inquiries` | Get user inquiries |
| POST | `/api/inquiries` | Send an inquiry |

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

Built with ❤️ for university students in Sri Lanka
