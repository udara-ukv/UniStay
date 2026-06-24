import { useNavigate } from 'react-router-dom';
import { Listing } from '../../types';
import { favoritesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

export default function ListingCard({ listing, onFavToggle }: { listing: Listing; onFavToggle?: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fav, setFav] = useState(listing.is_favorited);

  const toggleFav = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return navigate('/login');
    try {
      const res = await favoritesAPI.toggle(listing.id);
      setFav(res.data.favorited);
      onFavToggle?.();
    } catch {}
  };

  const imgSrc = listing.primary_image || `https://picsum.photos/seed/${listing.id}/600/400`;
  const rating = listing.avg_rating ? listing.avg_rating.toFixed(1) : null;

  return (
    <div className="card listing-card" onClick={() => navigate(`/listings/${listing.id}`)}>
      <div className="listing-card-image">
        <img src={imgSrc} alt={listing.title} loading="lazy" />
        <div className="listing-card-badges">
          <span className="badge badge-type">{listing.room_type}</span>
          {listing.is_verified && <span className="badge badge-verified">✓ Verified</span>}
        </div>
        <button className={`listing-card-fav ${fav ? 'active' : ''}`} onClick={toggleFav}>{fav ? '❤️' : '🤍'}</button>
      </div>
      <div className="listing-card-body">
        <div className="listing-card-title">{listing.title}</div>
        <div className="listing-card-location">📍 {listing.location}</div>
        <div className="listing-card-meta">
          {listing.distance_from_uni && <span>🏫 {listing.distance_from_uni} km</span>}
          <span>👤 {listing.gender_pref === 'any' ? 'Any' : listing.gender_pref}</span>
          <span>🛏️ {listing.max_occupants} {listing.max_occupants > 1 ? 'beds' : 'bed'}</span>
        </div>
        <div className="listing-card-footer">
          <div className="listing-card-price">Rs. {listing.rent.toLocaleString()} <small>/month</small></div>
          {rating && <div className="listing-card-rating"><span className="stars">⭐</span> {rating} ({listing.review_count})</div>}
        </div>
      </div>
    </div>
  );
}
