import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Listings from './pages/Listings';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import Favorites from './pages/Favorites';
import Inquiries from './pages/Inquiries';
import Profile from './pages/Profile';
import RoommateMatch from './pages/RoommateMatch';
import AdminDashboard from './pages/AdminDashboard';
import ChatWidget from './components/ChatWidget';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
          <Route path="/create-listing" element={<CreateListing />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/inquiries" element={<Inquiries />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/roommate" element={<RoommateMatch />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
        <Footer />
        <ChatWidget />
      </BrowserRouter>
    </AuthProvider>
  );
}
