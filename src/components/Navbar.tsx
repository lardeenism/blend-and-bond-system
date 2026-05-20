import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, UtensilsCrossed, Search, ShoppingCart, Sun, Moon, User, X, LogOut, LayoutDashboard, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getLogoImage } from '../utils/imageMap';
import './Navbar.css';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { getItemCount } = useCart();
  const { user, isAuthenticated, isAdmin, isStaff, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location]);

  const handleLogout = () => { logout(); navigate('/'); };
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container container">
        <Link to="/" className="navbar-brand">
          <img src={getLogoImage()} alt="Blend & Bond" className="navbar-logo" />
          <div className="navbar-brand-text">
            <span className="brand-name">Blend & Bond</span>
            <span className="brand-sub">C A F E</span>
          </div>
        </Link>

        <div className={`navbar-links ${mobileOpen ? 'open' : ''}`}>
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}><Home size={16} /> <span>Home</span></Link>
          <Link to="/menu" className={`nav-link ${isActive('/menu') ? 'active' : ''}`}><UtensilsCrossed size={16} /> <span>Menu</span></Link>
          <Link to="/track" className={`nav-link ${isActive('/track') ? 'active' : ''}`}><Search size={16} /> <span>Track Order</span></Link>
          <Link to="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`}><User size={16} /> <span>About Us</span></Link>

          {isAuthenticated && isAdmin && (
            <Link to="/admin" className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}><LayoutDashboard size={16} /> <span>Admin</span></Link>
          )}
          {isAuthenticated && isStaff && (
            <Link to="/staff" className={`nav-link ${location.pathname.startsWith('/staff') ? 'active' : ''}`}><LayoutDashboard size={16} /> <span>Staff</span></Link>
          )}

          <div className="nav-mobile-actions">
            {!isAuthenticated ? (
              <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
            ) : (
              <button onClick={handleLogout} className="btn btn-secondary btn-sm"><LogOut size={14} /> Logout</button>
            )}
          </div>
        </div>

        <div className="navbar-actions">
          <button onClick={toggleTheme} className="nav-action-btn theme-toggle" aria-label="Toggle theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Link to="/cart" className="nav-action-btn cart-btn" aria-label="Cart">
            <ShoppingCart size={18} />
            {getItemCount() > 0 && <span className="cart-badge">{getItemCount()}</span>}
          </Link>
          {isAuthenticated && (
            <div className="nav-user-menu">
              <button className="nav-action-btn user-btn"><User size={18} /></button>
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <span className="user-name">{user?.full_name}</span>
                  <span className="user-role">{user?.role}</span>
                </div>
                <button onClick={handleLogout} className="user-dropdown-item"><LogOut size={14} /> Logout</button>
              </div>
            </div>
          )}
          <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}
    </nav>
  );
}
