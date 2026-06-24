import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listingsAPI, inquiriesAPI, reviewsAPI, favoritesAPI } from '../services/api';
import { Listing } from '../types';
import { useAuth } from '../context/AuthContext';

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [inquirySent, setInquirySent] = useState(false);
  const [reviewForm, setReviewForm] = useState({ cleanliness: 5, safety: 5, internet: 5, landlord: 5, value_for_money: 5, comment: '' });
  const [reviewSent, setReviewSent] = useState(false);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    listingsAPI.getById(Number(id)).then(r => { setListing(r.data); setFav(r.data.is_favorited); }).catch(() => navigate('/listings')).finally(() => setLoading(false));
  }, [id]);

  const sendInquiry = async () => {
    if (!user) return navigate('/login');
    try {
      await inquiriesAPI.create({ listing_id: Number(id), message: inquiryMsg });
      setInquirySent(true);
    } catch {}
  };

  const sendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    try {
      await reviewsAPI.create({ listing_id: Number(id), ...reviewForm });
      setReviewSent(true);
      const r = await listingsAPI.getById(Number(id));
      setListing(r.data);
    } catch {}
  };

  const toggleFav = async () => {
    if (!user) return navigate('/login');
    const r = await favoritesAPI.toggle(Number(id));
    setFav(r.data.favorited);
  };

  if (loading) return <div className="page"><div className="loading"><div className="spinner"></div></div></div>;
  if (!listing) return <div className="page"><div className="container"><div className="empty-state"><h3>Listing not found</h3></div></div></div>;

  const imgSrc = listing.images?.length ? listing.images[0].image_url : `https://picsum.photos/seed/${listing.id}/800/500`;

  return (
    <div className="page">
      <div className="container">
        <div className="detail-header">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
            <div>
              <div className="detail-title">{listing.title}</div>
              <div className="detail-location">📍 {listing.location} {listing.address && `• ${listing.address}`}</div>
            </div>
            <button className={`btn ${fav ? 'btn-danger' : 'btn-secondary'}`} onClick={toggleFav}>{fav ? '❤️ Saved' : '🤍 Save'}</button>
          </div>
        </div>
        <div className="detail-grid">
          <div>
            <div className="detail-images"><img src={imgSrc} alt={listing.title} /></div>
            {listing.images && listing.images.length > 1 && (
              <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                {listing.images.slice(0, 5).map(img => (
                  <div key={img.id} style={{width:'80px',height:'60px',borderRadius:'8px',overflow:'hidden',border:'1px solid var(--border)'}}>
                    <img src={img.image_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                  </div>
                ))}
              </div>
            )}
            <div className="detail-section" style={{marginTop:'32px'}}>
              <h2>Description</h2>
              <p style={{color:'var(--text-secondary)',lineHeight:'1.8'}}>{listing.description}</p>
            </div>
            <div className="detail-section">
              <h2>Facilities</h2>
              <div className="facilities-grid">{listing.facilities.map((f, i) => <span key={i} className="facility-tag">{f}</span>)}</div>
            </div>
            {listing.rules.length > 0 && (
              <div className="detail-section">
                <h2>House Rules</h2>
                <ul style={{paddingLeft:'20px',color:'var(--text-secondary)'}}>
                  {listing.rules.map((r, i) => <li key={i} style={{marginBottom:'8px'}}>{r}</li>)}
                </ul>
              </div>
            )}
            <div className="detail-section">
              <h2>Reviews ({listing.review_count || 0})</h2>
              {listing.reviews?.map(r => (
                <div key={r.id} className="card review-card">
                  <div className="review-header">
                    <div className="review-author">
                      <div className="review-avatar">{r.reviewer_name?.charAt(0)}</div>
                      <div><div style={{fontWeight:600}}>{r.reviewer_name}</div><div style={{fontSize:'12px',color:'var(--text-muted)'}}>{new Date(r.created_at).toLocaleDateString()}</div></div>
                    </div>
                    <div style={{fontSize:'18px',fontWeight:700,color:'var(--accent)'}}>⭐ {r.overall.toFixed(1)}</div>
                  </div>
                  <div className="review-bars">
                    {[['Cleanliness', r.cleanliness], ['Safety', r.safety], ['Internet', r.internet], ['Landlord', r.landlord], ['Value', r.value_for_money]].map(([label, val]) => (
                      <div className="review-bar" key={label as string}><span style={{width:'80px',color:'var(--text-muted)'}}>{label}</span><div className="review-bar-track"><div className="review-bar-fill" style={{width:`${(val as number) * 20}%`}}></div></div><span>{val}</span></div>
                    ))}
                  </div>
                  {r.comment && <p style={{color:'var(--text-secondary)',fontSize:'14px'}}>{r.comment}</p>}
                </div>
              ))}
              {!reviewSent && user && user.id !== listing.owner_id && (
                <form className="card" style={{padding:'20px',marginTop:'16px'}} onSubmit={sendReview}>
                  <h3 style={{marginBottom:'16px'}}>Write a Review</h3>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
                    {(['cleanliness','safety','internet','landlord','value_for_money'] as const).map(k => (
                      <div className="form-group" key={k} style={{marginBottom:0}}>
                        <label className="form-label" style={{textTransform:'capitalize'}}>{k.replace('_',' ')}</label>
                        <select className="form-input" value={reviewForm[k]} onChange={e => setReviewForm({...reviewForm,[k]:Number(e.target.value)})}>
                          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ⭐</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="form-group"><textarea className="form-input" placeholder="Your review..." value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm,comment:e.target.value})} /></div>
                  <button className="btn btn-primary" type="submit">Submit Review</button>
                </form>
              )}
              {reviewSent && <div className="badge badge-verified" style={{marginTop:'12px',padding:'12px'}}>✓ Review submitted!</div>}
            </div>
          </div>
          <div className="detail-sidebar">
            <div className="card detail-price-card">
              <div className="detail-price">Rs. {listing.rent.toLocaleString()} <small>/month</small></div>
              <div className="detail-info">
                <div className="detail-info-item"><div className="detail-info-label">Type</div><div className="detail-info-value" style={{textTransform:'capitalize'}}>{listing.room_type}</div></div>
                <div className="detail-info-item"><div className="detail-info-label">Gender</div><div className="detail-info-value" style={{textTransform:'capitalize'}}>{listing.gender_pref}</div></div>
                <div className="detail-info-item"><div className="detail-info-label">Occupants</div><div className="detail-info-value">{listing.max_occupants}</div></div>
                <div className="detail-info-item"><div className="detail-info-label">Distance</div><div className="detail-info-value">{listing.distance_from_uni || '—'} km</div></div>
              </div>
              {listing.avg_rating && <div style={{textAlign:'center',fontSize:'16px',marginBottom:'16px'}}>⭐ {listing.avg_rating.toFixed(1)} ({listing.review_count} reviews)</div>}
              {listing.is_verified && <div className="badge badge-verified" style={{marginBottom:'16px',display:'flex',justifyContent:'center'}}>✓ Verified Listing</div>}
            </div>
            <div className="card" style={{padding:'24px'}}>
              <h3 style={{marginBottom:'4px'}}>Property Owner</h3>
              <div style={{display:'flex',alignItems:'center',gap:'12px',margin:'16px 0'}}>
                <div className="nav-avatar" style={{width:'48px',height:'48px',fontSize:'18px'}}>{listing.owner_name?.charAt(0)}</div>
                <div><div style={{fontWeight:600}}>{listing.owner_name}</div>{listing.owner_verified ? <span className="badge badge-verified" style={{marginTop:'4px'}}>✓ Verified</span> : null}</div>
              </div>
              {!inquirySent ? (
                <>
                  <textarea className="form-input" placeholder="Hi, I'm interested in this room..." value={inquiryMsg} onChange={e => setInquiryMsg(e.target.value)} rows={3} style={{marginBottom:'12px'}} />
                  <button className="btn btn-primary" style={{width:'100%'}} onClick={sendInquiry} disabled={!inquiryMsg.trim()}>📩 Send Inquiry</button>
                </>
              ) : <div className="badge badge-verified" style={{padding:'12px',width:'100%',justifyContent:'center'}}>✓ Inquiry sent!</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
