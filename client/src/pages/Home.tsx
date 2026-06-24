import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { listingsAPI } from '../services/api';
import { Listing } from '../types';
import ListingCard from '../components/listings/ListingCard';

export default function Home() {
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    listingsAPI.getAll({ limit: 6, sort: 'rating' }).then(r => setFeatured(r.data.listings)).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/listings?q=${encodeURIComponent(search)}`);
  };

  return (
    <>
      <section className="hero">
        <div className="container hero-content">
          <h1>Find Your Perfect <span className="highlight">Student Home</span></h1>
          <p>Discover safe, verified accommodation near your university. Connect with trusted landlords and find compatible roommates.</p>
          <form className="hero-search" onSubmit={handleSearch}>
            <input type="text" placeholder="Search by location, university, or keyword..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-primary" type="submit">🔍 Search</button>
          </form>
          <div className="hero-stats">
            <div className="hero-stat"><div className="hero-stat-value">500+</div><div className="hero-stat-label">Verified Listings</div></div>
            <div className="hero-stat"><div className="hero-stat-value">2,000+</div><div className="hero-stat-label">Happy Students</div></div>
            <div className="hero-stat"><div className="hero-stat-value">150+</div><div className="hero-stat-label">Trusted Owners</div></div>
          </div>
        </div>
      </section>

      <section className="page">
        <div className="container">
          <div className="section-header">
            <h2>🔥 Featured Listings</h2>
            <Link to="/listings" className="btn btn-secondary">View All →</Link>
          </div>
          <div className="listings-grid">
            {featured.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>

          <div style={{marginTop:'80px'}}>
            <div className="section-header"><h2>Why UniStay?</h2></div>
            <div className="stats-grid">
              {[
                { icon: '✅', title: 'Verified Listings', desc: 'Every listing is reviewed and approved by our team' },
                { icon: '🗺️', title: 'Location Based', desc: 'Find rooms near your university with distance info' },
                { icon: '👥', title: 'Roommate Matching', desc: 'Find compatible roommates based on lifestyle' },
                { icon: '⭐', title: 'Trusted Reviews', desc: 'Read real reviews from fellow students' },
              ].map((f, i) => (
                <div className="card" key={i} style={{padding:'28px',textAlign:'center'}}>
                  <div style={{fontSize:'40px',marginBottom:'12px'}}>{f.icon}</div>
                  <h3 style={{fontSize:'18px',fontWeight:700,marginBottom:'8px'}}>{f.title}</h3>
                  <p style={{color:'var(--text-muted)',fontSize:'14px'}}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
