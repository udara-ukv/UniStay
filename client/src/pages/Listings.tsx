import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchAPI } from '../services/api';
import { Listing } from '../types';
import ListingCard from '../components/listings/ListingCard';

export default function Listings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({ q: searchParams.get('q') || '', rent_min: '', rent_max: '', room_type: '', gender_pref: '', distance_max: '', sort: 'newest' });

  const fetchListings = async (p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: 12 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await searchAPI.search(params);
      setListings(res.data.listings);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
      setPage(p);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchListings(); }, []);
  const set = (k: string, v: string) => setFilters({ ...filters, [k]: v });

  return (
    <div className="page">
      <div className="container">
        <div className="section-header">
          <h2>Browse Accommodation</h2>
          <span style={{color:'var(--text-muted)'}}>{total} listings found</span>
        </div>
        <div className="search-layout">
          <div className="filter-panel glass-card" style={{padding:'24px'}}>
            <h3>🔍 Filters</h3>
            <div className="filter-section">
              <label>Search</label>
              <input className="form-input" placeholder="Keyword..." value={filters.q} onChange={e => set('q', e.target.value)} />
            </div>
            <div className="filter-section">
              <label>Rent Range (Rs.)</label>
              <div className="range-inputs">
                <input className="form-input" type="number" placeholder="Min" value={filters.rent_min} onChange={e => set('rent_min', e.target.value)} />
                <input className="form-input" type="number" placeholder="Max" value={filters.rent_max} onChange={e => set('rent_max', e.target.value)} />
              </div>
            </div>
            <div className="filter-section">
              <label>Room Type</label>
              <select className="form-input" value={filters.room_type} onChange={e => set('room_type', e.target.value)}>
                <option value="">All Types</option>
                <option value="single">Single Room</option>
                <option value="shared">Shared Room</option>
                <option value="annex">Annex</option>
                <option value="house">House</option>
              </select>
            </div>
            <div className="filter-section">
              <label>Gender</label>
              <select className="form-input" value={filters.gender_pref} onChange={e => set('gender_pref', e.target.value)}>
                <option value="">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="filter-section">
              <label>Max Distance (km)</label>
              <input className="form-input" type="number" placeholder="e.g. 5" value={filters.distance_max} onChange={e => set('distance_max', e.target.value)} />
            </div>
            <div className="filter-section">
              <label>Sort By</label>
              <select className="form-input" value={filters.sort} onChange={e => set('sort', e.target.value)}>
                <option value="newest">Newest</option>
                <option value="price_low">Price: Low → High</option>
                <option value="price_high">Price: High → Low</option>
                <option value="nearest">Nearest</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{width:'100%'}} onClick={() => fetchListings(1)}>Apply Filters</button>
          </div>
          <div>
            {loading ? (
              <div className="loading"><div className="spinner"></div></div>
            ) : listings.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">🏠</div><h3>No listings found</h3><p>Try adjusting your filters</p></div>
            ) : (
              <>
                <div className="listings-grid">{listings.map(l => <ListingCard key={l.id} listing={l} />)}</div>
                {totalPages > 1 && (
                  <div style={{display:'flex',justifyContent:'center',gap:'8px',marginTop:'32px'}}>
                    {Array.from({length: totalPages}, (_, i) => (
                      <button key={i} className={`btn ${page === i+1 ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => fetchListings(i+1)}>{i+1}</button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
