# 🏠 UniStay - Student Housing Platform

A full-stack student housing platform built to help university students in Sri Lanka find verified accommodation near campus. The app combines a React + TypeScript frontend with a Python FastAPI backend, and includes multi-role auth, roommate matching, admin controls, and an in-app chat assistant.

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **Backend** | Python, FastAPI |
| **Database** | SQLite |
| **Styling** | CSS with modern design system |
| **Auth** | JWT + bcrypt |

## ✨ Features

- 🔍 **Property Search** — Filter listings by location, rent, room type, and gender preference
- 🏡 **Listing Management** — Owners can create, update, and remove rental listings with images
- ⭐ **Reviews & Ratings** — Students can submit reviews and ratings for accommodations
- 💬 **Inquiries** — Send and track messages between tenants and property owners
- 👥 **Roommate Matching** — Match students to compatible roommates using profile preferences
- 🤖 **Chat Assistant** — Ask the app for listings, availability, and guidance via a built-in chatbot
- 🛠️ **Admin Dashboard** — Review site activity, manage users, and approve or reject listings
- ❤️ **Favorites** — Save and manage favorite properties
- 🔐 **Authentication** — JWT-backed auth with student, owner, and admin roles
- ✅ **Verification** — Student verification plus listing verification workflows

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
| PUT | `/api/listings/:id` | Update a listing |
| DELETE | `/api/listings/:id` | Delete a listing |
| GET | `/api/reviews/:listingId` | Get reviews for a listing |
| POST | `/api/reviews` | Create a review |
| GET | `/api/inquiries` | Get user inquiries |
| POST | `/api/inquiries` | Send an inquiry |
| POST | `/api/chat` | Send a chatbot message |

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

Built with ❤️ for university students in Sri Lanka
