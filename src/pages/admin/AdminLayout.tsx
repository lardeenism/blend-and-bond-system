import { useState, useEffect } from 'react';
import { Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Users, Star, BarChart3, Settings, Bell, LogOut, Coffee, Menu, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import AdminProducts from './AdminProducts';
import AdminOrders from './AdminOrders';
import AdminStaff from './AdminStaff';
import AdminReviews from './AdminReviews';
import AdminReports from './AdminReports';
import AdminSettings from './AdminSettings';
import AdminNotifications from './AdminNotifications';
import './AdminPanel.css';

export default function AdminLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [viewedPending, setViewedPending] = useState(() => Number(localStorage.getItem('admin_viewed_pending') || 0));

  useEffect(() => {
    if (!isAdmin) { navigate('/login'); }
  }, [isAdmin]);

  useEffect(() => { 
    setSidebarOpen(false); 
    if (location.pathname === '/admin/orders') {
      localStorage.setItem('admin_viewed_pending', pendingOrders.toString());
      setViewedPending(pendingOrders);
    }
  }, [location, pendingOrders]);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchNotifs = () => {
      axios.get('/api/dashboard/notifications')
        .then(res => {
          setUnreadCount(res.data.unreadCount);
          setPendingOrders(res.data.pendingOrdersCount || 0);
        })
        .catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (!isAdmin) return null;

  const newOrdersBadge = Math.max(0, pendingOrders - viewedPending);

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/products', label: 'Products', icon: Package },
    { path: '/admin/orders', label: 'Orders', icon: ShoppingBag, badge: newOrdersBadge },
    { path: '/admin/staff', label: 'Staff', icon: Users },
    { path: '/admin/reviews', label: 'Reviews', icon: Star },
    { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const getPageTitle = () => {
    if (location.pathname.startsWith('/admin/notifications')) return 'Notifications';
    return navItems.find(n => isActive(n.path))?.label || 'Admin';
  };

  return (
    <div className="panel-layout">
      <aside className={`panel-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Coffee className="sidebar-logo-icon" size={28} />
          <div>
            <span className="sidebar-brand">Blend & Bond</span>
            <span className="sidebar-role">Admin Panel</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link key={item.path} to={item.path}
              className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}>
              <item.icon size={18} />
              <span>{item.label}</span>
              {(item as any).badge > 0 && <span className="sidebar-badge">{(item as any).badge}</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="sidebar-avatar">{user?.full_name?.[0] || 'A'}</div>
            <div>
              <span className="sidebar-user-name">{user?.full_name}</span>
              <span className="sidebar-user-role">Administrator</span>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/'); }} className="sidebar-logout">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="panel-main">
        <div className="panel-topbar">
          <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1 className="topbar-title">
            {getPageTitle()}
          </h1>
          <div className="topbar-actions">
            <Link to="/admin/notifications" className="topbar-notif-btn">
              <Bell size={18} />
              {unreadCount > 0 && <span className="notif-dot">{unreadCount}</span>}
            </Link>
          </div>
        </div>
        <div className="panel-content" key={location.pathname}>
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="notifications" element={<AdminNotifications />} />
          </Routes>
        </div>
      </main>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
