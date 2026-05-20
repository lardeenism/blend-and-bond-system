import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getLogoImage } from '../utils/imageMap';
import './LoginPage.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successTransition, setSuccessTransition] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      toast.success('Welcome back!');
      setSuccessTransition(true);

      const token = localStorage.getItem('bb-token');
      const targetPath = (() => {
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.role === 'admin') return '/admin';
            if (payload.role === 'staff') return '/staff';
          } catch {}
        }
        return '/';
      })();

      setTimeout(() => {
        navigate(targetPath);
      }, 300);
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="login-page">
      {/* Floating particles background */}
      <div className="login-particles">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="login-particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${4 + Math.random() * 6}s`,
          }} />
        ))}
      </div>

      <div className="login-container">
        <div className={`login-card glass-card animate-scale-in ${successTransition ? 'leaving' : ''}`}>
          {/* Back button inside card */}
          <button className="login-back-btn" onClick={handleBack} aria-label="Go back">
            <X size={18} />
          </button>

          <div className="login-header">
            <div className="login-logo-wrapper">
              <img src={getLogoImage()} alt="Blend & Bond Café" className="login-logo-img" />
            </div>
            <h1>Welcome Back</h1>
            <p>Sign in to Blend & Bond Café</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-with-icon">
                <User className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <Lock className="input-icon" />
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg login-btn" disabled={loading || successTransition}>
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  Signing in...
                </>
              ) : successTransition ? (
                'Redirecting...'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>Admin & Staff access only</p>
          </div>
        </div>
      </div>
    </div>
  );
}
