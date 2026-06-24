import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">🏠 <span>UniStay</span></div>
            <p>Find safe, verified student accommodation near your university. Connect with trusted landlords and compatible roommates.</p>
          </div>
          <div>
            <h4>Platform</h4>
            <ul>
              <li><Link to="/listings">Browse Listings</Link></li>
              <li><Link to="/roommate">Find Roommates</Link></li>
              <li><Link to="/create-listing">List Property</Link></li>
            </ul>
          </div>
          <div>
            <h4>Support</h4>
            <ul>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Safety Guide</a></li>
              <li><a href="#">Report Issue</a></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">© 2026 UniStay. Built for students, by students.</div>
      </div>
    </footer>
  );
}
