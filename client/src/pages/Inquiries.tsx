import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inquiriesAPI } from '../services/api';
import { Inquiry } from '../types';
import { useAuth } from '../context/AuthContext';

export default function Inquiries() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'sent'|'received'>('sent');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondId, setRespondId] = useState<number|null>(null);
  const [response, setResponse] = useState({ status: 'accepted', owner_response: '' });

  useEffect(() => { if (!user) navigate('/login'); }, [user]);
  useEffect(() => { load(); }, [tab]);

  const load = () => { setLoading(true); (tab === 'sent' ? inquiriesAPI.getSent() : inquiriesAPI.getReceived()).then(r => setInquiries(r.data)).catch(() => {}).finally(() => setLoading(false)); };

  const handleRespond = async (id: number) => {
    try { await inquiriesAPI.respond(id, response); setRespondId(null); load(); } catch {}
  };

  const statusBadge = (s: string) => s === 'accepted' ? 'badge-verified' : s === 'rejected' ? 'badge-rejected' : 'badge-pending';

  return (
    <div className="page"><div className="container" style={{maxWidth:'800px'}}>
      <h2 style={{fontSize:'28px',fontWeight:800,marginBottom:'24px'}}>📩 Inquiries</h2>
      <div className="tabs">
        <button className={`tab ${tab==='sent'?'active':''}`} onClick={() => setTab('sent')}>Sent</button>
        {user?.role !== 'student' && <button className={`tab ${tab==='received'?'active':''}`} onClick={() => setTab('received')}>Received</button>}
      </div>
      {loading ? <div className="loading"><div className="spinner"></div></div> : inquiries.length === 0 ? <div className="empty-state"><div className="empty-state-icon">📭</div><h3>No inquiries</h3></div> : (
        inquiries.map(inq => (
          <div key={inq.id} className="card inquiry-card">
            <div className="inquiry-card-body">
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                <strong>{inq.listing_title}</strong>
                <span className={`badge ${statusBadge(inq.status)}`}>{inq.status}</span>
              </div>
              {tab === 'received' && <div style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'8px'}}>From: {inq.student_name} {inq.student_email && `(${inq.student_email})`}</div>}
              <p style={{color:'var(--text-secondary)',fontSize:'14px',marginBottom:'8px'}}>{inq.message}</p>
              {inq.owner_response && <div style={{padding:'12px',background:'var(--bg-secondary)',borderRadius:'8px',fontSize:'14px',color:'var(--text-secondary)',marginBottom:'8px'}}><strong>Response:</strong> {inq.owner_response}</div>}
              <div style={{fontSize:'12px',color:'var(--text-muted)'}}>{new Date(inq.created_at).toLocaleDateString()}</div>
              {tab === 'received' && inq.status === 'pending' && (
                respondId === inq.id ? (
                  <div style={{marginTop:'12px',padding:'16px',background:'var(--bg-secondary)',borderRadius:'8px'}}>
                    <select className="form-input" style={{marginBottom:'8px'}} value={response.status} onChange={e => setResponse({...response, status: e.target.value})}><option value="accepted">Accept</option><option value="rejected">Reject</option></select>
                    <textarea className="form-input" placeholder="Your response..." value={response.owner_response} onChange={e => setResponse({...response, owner_response: e.target.value})} rows={2} style={{marginBottom:'8px'}} />
                    <div style={{display:'flex',gap:'8px'}}><button className="btn btn-primary btn-sm" onClick={() => handleRespond(inq.id)}>Send</button><button className="btn btn-secondary btn-sm" onClick={() => setRespondId(null)}>Cancel</button></div>
                  </div>
                ) : <button className="btn btn-secondary btn-sm" style={{marginTop:'8px'}} onClick={() => setRespondId(inq.id)}>Respond</button>
              )}
            </div>
          </div>
        ))
      )}
    </div></div>
  );
}
