import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'student', university: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-card">
        <h1>Create Account</h1>
        <p>Join UniStay and find your perfect accommodation</p>
        {error && <div className="toast-error" style={{padding:'12px',borderRadius:'8px',marginBottom:'20px',textAlign:'center'}}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your full name" required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 6 characters" required minLength={6} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="077XXXXXXX" />
          </div>
          <div className="form-group">
            <label className="form-label">I am a...</label>
            <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="student">Student</option>
              <option value="owner">Property Owner</option>
            </select>
          </div>
          {form.role === 'student' && (
            <div className="form-group">
              <label className="form-label">University</label>
              <input className="form-input" value={form.university} onChange={e => set('university', e.target.value)} placeholder="e.g. NSBM Green University" />
            </div>
          )}
          <button className="btn btn-primary btn-lg" style={{width:'100%'}} disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
        </form>
        <div className="auth-divider">Already have an account? <Link to="/login">Sign in</Link></div>
      </div>
    </div>
  );
}
