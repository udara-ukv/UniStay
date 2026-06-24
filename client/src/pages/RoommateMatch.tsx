import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roommateAPI } from '../services/api';
import { RoommateProfile } from '../types';
import { useAuth } from '../context/AuthContext';

export default function RoommateMatch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'profile'|'matches'>('profile');
  const [profile, setProfile] = useState<any>({ budget_min:'5000', budget_max:'15000', sleep_schedule:'normal', study_habits:'moderate', smoking:false, gender_pref:'any', cleanliness_level:'medium', bio:'' });
  const [matches, setMatches] = useState<RoommateProfile[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!user) navigate('/login'); else loadProfile(); }, [user]);

  const loadProfile = async () => {
    try { const r = await roommateAPI.getProfile(); if (r.data) setProfile(r.data); } catch {}
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await roommateAPI.saveProfile({...profile, budget_min: Number(profile.budget_min), budget_max: Number(profile.budget_max)});
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const loadMatches = async () => {
    setTab('matches'); setLoading(true);
    try { const r = await roommateAPI.getMatches(); setMatches(r.data); } catch {}
    setLoading(false);
  };

  const compatColor = (c: number) => c >= 70 ? 'var(--success)' : c >= 40 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="page"><div className="container" style={{maxWidth:'900px'}}>
      <h1 style={{fontSize:'28px',fontWeight:800,marginBottom:'8px'}}>👥 Roommate Matching</h1>
      <p style={{color:'var(--text-muted)',marginBottom:'24px'}}>Find compatible roommates based on your lifestyle preferences</p>
      <div className="tabs">
        <button className={`tab ${tab==='profile'?'active':''}`} onClick={() => setTab('profile')}>My Profile</button>
        <button className={`tab ${tab==='matches'?'active':''}`} onClick={loadMatches}>Find Matches</button>
      </div>
      {tab === 'profile' ? (
        <form onSubmit={saveProfile} className="glass-card" style={{padding:'32px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <div className="form-group"><label className="form-label">Min Budget (Rs.)</label><input className="form-input" type="number" value={profile.budget_min} onChange={e => setProfile({...profile, budget_min: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Max Budget (Rs.)</label><input className="form-input" type="number" value={profile.budget_max} onChange={e => setProfile({...profile, budget_max: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Sleep Schedule</label><select className="form-input" value={profile.sleep_schedule} onChange={e => setProfile({...profile, sleep_schedule: e.target.value})}><option value="early">Early Bird</option><option value="normal">Normal</option><option value="late">Night Owl</option></select></div>
            <div className="form-group"><label className="form-label">Study Habits</label><select className="form-input" value={profile.study_habits} onChange={e => setProfile({...profile, study_habits: e.target.value})}><option value="quiet">Quiet</option><option value="moderate">Moderate</option><option value="social">Social</option></select></div>
            <div className="form-group"><label className="form-label">Gender Preference</label><select className="form-input" value={profile.gender_pref} onChange={e => setProfile({...profile, gender_pref: e.target.value})}><option value="any">Any</option><option value="male">Male</option><option value="female">Female</option></select></div>
            <div className="form-group"><label className="form-label">Cleanliness</label><select className="form-input" value={profile.cleanliness_level} onChange={e => setProfile({...profile, cleanliness_level: e.target.value})}><option value="high">High</option><option value="medium">Medium</option><option value="low">Relaxed</option></select></div>
          </div>
          <div className="form-group" style={{marginTop:'8px'}}><label className="form-label" style={{display:'flex',alignItems:'center',gap:'8px'}}><input type="checkbox" checked={profile.smoking} onChange={e => setProfile({...profile, smoking: e.target.checked})} /> I smoke</label></div>
          <div className="form-group"><label className="form-label">About Me</label><textarea className="form-input" value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} placeholder="Tell potential roommates about yourself..." rows={3} /></div>
          <div style={{display:'flex',gap:'12px'}}><button className="btn btn-primary" type="submit">Save Profile</button>{saved && <span className="badge badge-verified" style={{alignSelf:'center'}}>✓ Saved!</span>}</div>
        </form>
      ) : loading ? <div className="loading"><div className="spinner"></div></div> : matches.length === 0 ? <div className="empty-state"><div className="empty-state-icon">🔍</div><h3>No matches yet</h3><p>Save your profile first</p></div> : (
        <div className="listings-grid">
          {matches.map(m => (
            <div key={m.id} className="card match-card">
              <div className="match-avatar">{m.name?.charAt(0)}</div>
              <h3 style={{fontSize:'18px',fontWeight:700}}>{m.name}</h3>
              {m.university && <div style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'8px'}}>{m.university}</div>}
              <div className="match-score" style={{background:`${compatColor(m.compatibility!)}20`,color:compatColor(m.compatibility!)}}>{m.compatibility}% Match</div>
              <div className="match-tags">
                <span className="match-tag">🌙 {m.sleep_schedule}</span>
                <span className="match-tag">📚 {m.study_habits}</span>
                <span className="match-tag">🧹 {m.cleanliness_level}</span>
                <span className="match-tag">💰 Rs.{m.budget_min?.toLocaleString()}-{m.budget_max?.toLocaleString()}</span>
                {m.smoking && <span className="match-tag">🚬 Smoker</span>}
              </div>
              {m.bio && <p style={{fontSize:'13px',color:'var(--text-secondary)',marginTop:'12px'}}>{m.bio}</p>}
            </div>
          ))}
        </div>
      )}
    </div></div>
  );
}
