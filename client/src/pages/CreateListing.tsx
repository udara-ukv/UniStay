import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const FACILITIES = ['Wi-Fi','Hot Water','Parking','Kitchen','Laundry','Air Conditioning','CCTV','Study Table','Wardrobe','Attached Bathroom','Washing Machine','Meals Available','Gym Access','Garden'];

export default function CreateListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title:'', description:'', rent:'', location:'', address:'', latitude:'', longitude:'', distance_from_uni:'', room_type:'single', gender_pref:'any', max_occupants:'1', rules:'' });
  const [facilities, setFacilities] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return <div className="page"><div className="container"><div className="empty-state"><h3>Access Denied</h3><p>Only property owners can create listings</p></div></div></div>;
  }

  const set = (k: string, v: string) => setForm({...form, [k]: v});
  const toggleFacility = (f: string) => setFacilities(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('facilities', JSON.stringify(facilities));
      fd.append('rules', JSON.stringify(form.rules.split('\n').filter(Boolean)));
      images.forEach(img => fd.append('images', img));
      await listingsAPI.create(fd);
      navigate('/listings');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create listing');
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <div className="container" style={{maxWidth:'700px'}}>
        <h1 style={{fontSize:'28px',fontWeight:800,marginBottom:'32px'}}>📝 Create New Listing</h1>
        {error && <div className="toast-error" style={{padding:'12px',borderRadius:'8px',marginBottom:'20px'}}>{error}</div>}
        <form onSubmit={handleSubmit} className="glass-card" style={{padding:'32px'}}>
          <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Cozy Single Room near NSBM" required /></div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the room..." rows={4} /></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <div className="form-group"><label className="form-label">Rent (Rs.) *</label><input className="form-input" type="number" value={form.rent} onChange={e => set('rent', e.target.value)} placeholder="12000" required /></div>
            <div className="form-group"><label className="form-label">Room Type</label><select className="form-input" value={form.room_type} onChange={e => set('room_type', e.target.value)}><option value="single">Single</option><option value="shared">Shared</option><option value="annex">Annex</option><option value="house">House</option></select></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <div className="form-group"><label className="form-label">Location *</label><input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Pitipana, Homagama" required /></div>
            <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" /></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px'}}>
            <div className="form-group"><label className="form-label">Gender Pref</label><select className="form-input" value={form.gender_pref} onChange={e => set('gender_pref', e.target.value)}><option value="any">Any</option><option value="male">Male</option><option value="female">Female</option></select></div>
            <div className="form-group"><label className="form-label">Max Occupants</label><input className="form-input" type="number" value={form.max_occupants} onChange={e => set('max_occupants', e.target.value)} min="1" /></div>
            <div className="form-group"><label className="form-label">Distance (km)</label><input className="form-input" type="number" step="0.1" value={form.distance_from_uni} onChange={e => set('distance_from_uni', e.target.value)} placeholder="2.5" /></div>
          </div>
          <div className="form-group">
            <label className="form-label">Facilities</label>
            <div className="facilities-grid">{FACILITIES.map(f => <span key={f} className="facility-tag" style={{cursor:'pointer',background:facilities.includes(f)?'rgba(232,99,74,0.25)':'rgba(232,99,74,0.1)'}} onClick={() => toggleFacility(f)}>{facilities.includes(f) ? '✓ ':''}{f}</span>)}</div>
          </div>
          <div className="form-group"><label className="form-label">House Rules (one per line)</label><textarea className="form-input" value={form.rules} onChange={e => set('rules', e.target.value)} placeholder="No smoking&#10;Quiet after 10 PM" rows={3} /></div>
          <div className="form-group">
            <label className="form-label">Photos</label>
            <input type="file" accept="image/*" multiple onChange={e => setImages(Array.from(e.target.files || []))} style={{color:'var(--text-secondary)'}} />
            {images.length > 0 && <div style={{marginTop:'8px',fontSize:'13px',color:'var(--text-muted)'}}>{images.length} file(s) selected</div>}
          </div>
          <button className="btn btn-primary btn-lg" style={{width:'100%',marginTop:'8px'}} disabled={loading}>{loading ? 'Creating...' : '🏠 Create Listing'}</button>
        </form>
      </div>
    </div>
  );
}
