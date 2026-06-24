import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { favoritesAPI } from '../services/api';
import { Listing } from '../types';
import { useAuth } from '../context/AuthContext';
import ListingCard from '../components/listings/ListingCard';

export default function Favorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!user) { navigate('/login'); return; } load(); }, [user]);
  const load = () => { favoritesAPI.getAll().then(r => setFavorites(r.data)).catch(() => {}).finally(() => setLoading(false)); };

  if (loading) return <div className="page"><div className="loading"><div className="spinner"></div></div></div>;
  return (
    <div className="page"><div className="container">
      <div className="section-header"><h2>❤️ My Favorites</h2><span style={{color:'var(--text-muted)'}}>{favorites.length} saved</span></div>
      {favorites.length === 0 ? <div className="empty-state"><div className="empty-state-icon">💔</div><h3>No favorites yet</h3><p>Save listings you like and they'll appear here</p></div>
        : <div className="listings-grid">{favorites.map(l => <ListingCard key={l.id} listing={l} onFavToggle={load} />)}</div>}
    </div></div>
  );
}
