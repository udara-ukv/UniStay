import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { Analytics, Listing } from '../types';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [pending, setPending] = useState<Listing[]>([]);
  const [tab, setTab] = useState<'overview'|'pending'|'users'>('overview');
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => { if (!user || user.role !== 'admin') { navigate('/'); return; } loadData(); }, [user]);
  const loadData = async () => {
    try { const [a, p] = await Promise.all([adminAPI.getAnalytics(), adminAPI.getPending()]); setAnalytics(a.data); setPending(p.data); } catch {}
  };
  const loadUsers = async () => { setTab('users'); try { const r = await adminAPI.getUsers(); setUsers(r.data); } catch {} };
  const approve = async (id: number) => { await adminAPI.approve(id); loadData(); };
  const reject = async (id: number) => { await adminAPI.reject(id); loadData(); };

  if (!analytics) return <div className="page"><div className="loading"><div className="spinner"></div></div></div>;

  return (
    <div className="page"><div className="container">
      <h1 style={{fontSize:'28px',fontWeight:800,marginBottom:'24px'}}>🛡️ Admin Dashboard</h1>
      <div className="stats-grid">
        {[
          { icon: '👥', value: analytics.users.total, label: 'Total Users', color: '#6366f1' },
          { icon: '🏠', value: analytics.listings.approved, label: 'Active Listings', color: '#10b981' },
          { icon: '⏳', value: analytics.listings.pending, label: 'Pending Review', color: '#f59e0b' },
          { icon: '📩', value: analytics.inquiries.total, label: 'Inquiries', color: '#06b6d4' },
          { icon: '⭐', value: analytics.reviews.total, label: 'Reviews', color: '#8b5cf6' },
          { icon: '💰', value: `Rs.${analytics.avgRent.toLocaleString()}`, label: 'Avg. Rent', color: '#ec4899' },
        ].map((s, i) => (
          <div className="card stat-card" key={i}>
            <div className="stat-card-icon" style={{background:`${s.color}20`,color:s.color}}>{s.icon}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="tabs">
        <button className={`tab ${tab==='overview'?'active':''}`} onClick={() => setTab('overview')}>Overview</button>
        <button className={`tab ${tab==='pending'?'active':''}`} onClick={() => setTab('pending')}>Pending ({pending.length})</button>
        <button className={`tab ${tab==='users'?'active':''}`} onClick={loadUsers}>Users</button>
      </div>
      {tab === 'overview' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'24px'}}>
          <div className="card" style={{padding:'24px'}}><h3 style={{marginBottom:'16px'}}>Recent Listings</h3>
            {analytics.recentListings.map(l => <div key={l.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)'}}><span>{l.title}</span><span className={`badge ${l.status==='approved'?'badge-verified':'badge-pending'}`}>{l.status}</span></div>)}
          </div>
          <div className="card" style={{padding:'24px'}}><h3 style={{marginBottom:'16px'}}>Recent Users</h3>
            {analytics.recentUsers.map(u => <div key={u.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)'}}><span>{u.name}</span><span className="badge badge-type">{u.role}</span></div>)}
          </div>
        </div>
      )}
      {tab === 'pending' && (pending.length === 0 ? <div className="empty-state"><h3>No pending listings</h3></div> :
        pending.map(l => (
          <div key={l.id} className="card" style={{padding:'20px',marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div><strong>{l.title}</strong><div style={{fontSize:'13px',color:'var(--text-muted)'}}>By {l.owner_name} • Rs.{l.rent.toLocaleString()} • {l.location}</div></div>
            <div style={{display:'flex',gap:'8px'}}><button className="btn btn-success btn-sm" onClick={() => approve(l.id)}>✓ Approve</button><button className="btn btn-danger btn-sm" onClick={() => reject(l.id)}>✗ Reject</button></div>
          </div>
        ))
      )}
      {tab === 'users' && (
        <div className="card" style={{overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
            {['Name','Email','Role','Verified','Joined'].map(h => <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:'13px',color:'var(--text-muted)',fontWeight:600}}>{h}</th>)}
          </tr></thead>
          <tbody>{users.map(u => <tr key={u.id} style={{borderBottom:'1px solid var(--border)'}}>
            <td style={{padding:'12px 16px',fontWeight:500}}>{u.name}</td>
            <td style={{padding:'12px 16px',color:'var(--text-secondary)'}}>{u.email}</td>
            <td style={{padding:'12px 16px'}}><span className="badge badge-type">{u.role}</span></td>
            <td style={{padding:'12px 16px'}}>{u.is_verified ? '✓' : '—'}</td>
            <td style={{padding:'12px 16px',color:'var(--text-muted)',fontSize:'13px'}}>{new Date(u.created_at).toLocaleDateString()}</td>
          </tr>)}</tbody>
        </table></div>
      )}
    </div></div>
  );
}
