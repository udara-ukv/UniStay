import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-card">
        <h1>Welcome Back</h1>
        <p>Sign in to your UniStay account</p>
        {error && <div className="toast-error" style={{padding:'12px',borderRadius:'8px',marginBottom:'20px',textAlign:'center'}}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary btn-lg" style={{width:'100%'}} disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>
        <div className="auth-divider">Don't have an account? <Link to="/register">Sign up</Link></div>
        <div style={{fontSize:'12px',color:'var(--text-muted)',textAlign:'center'}}>
          Demo: admin@unistay.lk / sahan@student.com / kamal@example.com — password: password123
        </div>
      </div>
    </div>
  );
}
