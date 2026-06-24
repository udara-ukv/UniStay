import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">🏠 <span>UniStay</span></Link>
        <button className="mobile-toggle" onClick={() => setOpen(!open)}>☰</button>
        <div className={`navbar-links ${open ? 'open' : ''}`}>
          <Link to="/listings" className={isActive('/listings')} onClick={() => setOpen(false)}>Browse</Link>
          <Link to="/roommate" className={isActive('/roommate')} onClick={() => setOpen(false)}>Roommates</Link>
          {user ? (
            <>
              {user.role === 'owner' && <Link to="/create-listing" className={isActive('/create-listing')} onClick={() => setOpen(false)}>Add Listing</Link>}
              <Link to="/favorites" className={isActive('/favorites')} onClick={() => setOpen(false)}>Favorites</Link>
              <Link to="/inquiries" className={isActive('/inquiries')} onClick={() => setOpen(false)}>Inquiries</Link>
              {user.role === 'admin' && <Link to="/admin" className={isActive('/admin')} onClick={() => setOpen(false)}>Admin</Link>}
              <Link to="/profile" className={isActive('/profile')} onClick={() => setOpen(false)}>
                <div className="nav-user">
                  <div className="nav-avatar">{user.name.charAt(0)}</div>
                </div>
              </Link>
              <button onClick={() => { logout(); setOpen(false); }} style={{color:'var(--danger)'}}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className={isActive('/login')} onClick={() => setOpen(false)}>Login</Link>
              <Link to="/register" onClick={() => setOpen(false)}><button className="btn btn-primary btn-sm">Sign Up</button></Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
