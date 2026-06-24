import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { listingsAPI } from '../services/api';
import { Listing } from '../types';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', university: '', bio: '' });
  const [saved, setSaved] = useState(false);
  const [myListings, setMyListings] = useState<Listing[]>([]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setForm({ name: user.name, phone: user.phone || '', university: user.university || '', bio: user.bio || '' });
    if (user.role === 'owner') listingsAPI.getMy().then(r => setMyListings(r.data)).catch(() => {});
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUser(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!user) return null;
  return (
    <div className="page"><div className="container" style={{maxWidth:'700px'}}>
      <h1 style={{fontSize:'28px',fontWeight:800,marginBottom:'32px'}}>👤 Profile</h1>
      <div className="glass-card" style={{padding:'32px',marginBottom:'24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'20px',marginBottom:'24px'}}>
          <div className="nav-avatar" style={{width:'64px',height:'64px',fontSize:'24px'}}>{user.name.charAt(0)}</div>
          <div>
            <h2 style={{fontSize:'22px',fontWeight:700}}>{user.name}</h2>
            <div style={{color:'var(--text-muted)'}}>{user.email}</div>
            <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
              <span className="badge badge-type" style={{textTransform:'capitalize'}}>{user.role}</span>
              {user.is_verified && <span className="badge badge-verified">✓ Verified</span>}
            </div>
          </div>
        </div>
        <form onSubmit={handleSave}>
          <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">University</label><input className="form-input" value={form.university} onChange={e => setForm({...form, university: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Bio</label><textarea className="form-input" value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} rows={3} /></div>
          <div style={{display:'flex',gap:'12px'}}>
            <button className="btn btn-primary" type="submit">Save Changes</button>
            {saved && <span className="badge badge-verified" style={{alignSelf:'center'}}>✓ Saved!</span>}
          </div>
        </form>
      </div>
      {user.role === 'owner' && myListings.length > 0 && (
        <div><h2 style={{fontSize:'22px',fontWeight:700,marginBottom:'16px'}}>My Listings</h2>
          {myListings.map(l => (
            <div key={l.id} className="card" style={{padding:'16px',marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div><strong>{l.title}</strong><div style={{fontSize:'13px',color:'var(--text-muted)'}}>Rs. {l.rent.toLocaleString()} • {l.location}</div></div>
              <span className={`badge ${l.status==='approved'?'badge-verified':l.status==='pending'?'badge-pending':'badge-rejected'}`}>{l.status}</span>
            </div>
          ))}
        </div>
      )}
      <button className="btn btn-danger" style={{marginTop:'24px'}} onClick={() => { logout(); navigate('/'); }}>Logout</button>
    </div></div>
  );
}
