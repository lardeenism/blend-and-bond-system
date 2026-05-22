import { useState, useEffect } from 'react';
import { Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Bell, LogOut, Coffee, Menu, X, ArrowRight, Clock, CheckCircle, ChefHat, MapPin, Phone, User, FileText, CheckCheck } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDateTime, getStatusLabel } from '../../utils/helpers';
import { getProductImage } from '../../utils/imageMap';
import '../admin/AdminPanel.css';
import './StaffPanel.css';

let cachedStaffOrders: any[] = [];
let cachedStaffNotifications: any[] = [];

// ===== STAFF DASHBOARD =====
function StaffDashboard() {
  const [orders, setOrders] = useState<any[]>(cachedStaffOrders);
  const [loading, setLoading] = useState(cachedStaffOrders.length === 0);

  useEffect(() => { fetchOrders(); }, []);
  const fetchOrders = () => {
    if (cachedStaffOrders.length === 0) setLoading(true);
    axios.get('/api/orders').then(r => {
      cachedStaffOrders = r.data.orders;
      setOrders(r.data.orders);
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  };

  const active = orders.filter(o => !['completed', 'cancelled'].includes(o.status));
  const pending = orders.filter(o => o.status === 'pending').length;
  const preparing = orders.filter(o => o.status === 'preparing').length;
  const completed = orders.filter(o => o.status === 'completed').length;

  if (loading) {
    return null;
  }

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card stat-primary"><div className="stat-icon-wrap"><ShoppingBag size={20} /></div><div><div className="stat-value">{active.length}</div><div className="stat-label">Active Orders</div></div></div>
        <div className="stat-card stat-warning"><div className="stat-icon-wrap"><Clock size={20} /></div><div><div className="stat-value">{pending}</div><div className="stat-label">Pending</div></div></div>
        <div className="stat-card stat-info"><div className="stat-icon-wrap"><ChefHat size={20} /></div><div><div className="stat-value">{preparing}</div><div className="stat-label">Preparing</div></div></div>
        <div className="stat-card stat-success"><div className="stat-icon-wrap"><CheckCircle size={20} /></div><div><div className="stat-value">{completed}</div><div className="stat-label">Completed</div></div></div>
      </div>

      <h3 className="section-heading" style={{ marginBottom: '16px', marginTop: '24px' }}>Active Orders</h3>
      <div className="orders-list">
        {active.length === 0 && <div className="empty-state"><p>No active orders</p></div>}
        {active.map(order => <StaffOrderCard key={order.id} order={order} onUpdate={fetchOrders} />)}
      </div>
    </div>
  );
}

// ===== ALL ORDERS =====
function StaffOrders() {
  const [orders, setOrders] = useState<any[]>(cachedStaffOrders);
  const [loading, setLoading] = useState(cachedStaffOrders.length === 0);
  const [filter, setFilter] = useState('');

  useEffect(() => { fetchOrders(); }, []);
  const fetchOrders = () => {
    if (cachedStaffOrders.length === 0) setLoading(true);
    axios.get('/api/orders').then(r => {
      cachedStaffOrders = r.data.orders;
      setOrders(r.data.orders);
    }).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  };

  if (loading) return null;

  const filtered = filter ? orders.filter(o => o.status === filter) : orders;

  return (
    <div>
      <div className="filter-pills" style={{ marginBottom: '20px' }}>
        {['', 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed'].map(f => (
          <button key={f} className={`pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f ? getStatusLabel(f) : 'All'}
          </button>
        ))}
      </div>
      <div className="orders-list">
        {filtered.map((order: any) => <StaffOrderCard key={order.id} order={order} onUpdate={fetchOrders} />)}
      </div>
    </div>
  );
}

// ===== STAFF NOTIFICATIONS =====
function StaffNotifications() {
  const [notifications, setNotifications] = useState<any[]>(cachedStaffNotifications);
  const [loading, setLoading] = useState(cachedStaffNotifications.length === 0);

  useEffect(() => { fetchNotifs(); }, []);
  const fetchNotifs = () => {
    if (cachedStaffNotifications.length === 0) setLoading(true);
    axios.get('/api/dashboard/notifications').then(r => {
      cachedStaffNotifications = r.data.notifications;
      setNotifications(r.data.notifications);
    }).catch(() => { }).finally(() => setLoading(false));
  };
  const markAllRead = async () => {
    await axios.put('/api/dashboard/notifications/read-all');
    toast.success('All marked as read'); fetchNotifs();
  };

  if (loading) return null;
  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Notifications</h2><p className="page-subtitle">{unread} unread</p></div>
        {unread > 0 && <button onClick={markAllRead} className="btn btn-secondary"><CheckCheck size={16} /> Mark All Read</button>}
      </div>
      <div className="notif-list">
        {notifications.length === 0 && <div className="empty-state"><Bell size={40} className="empty-icon" /><p>No notifications</p></div>}
        {notifications.map(n => (
          <div key={n.id} className={`notif-card glass-card ${!n.is_read ? 'unread' : ''}`}
            onClick={() => !n.is_read && axios.put(`/api/dashboard/notifications/${n.id}/read`).then(() => fetchNotifs())}>
            <div className={`notif-icon-wrap notif-type-${n.type}`}><ShoppingBag size={18} /></div>
            <div className="notif-body">
              <span className="notif-title">{n.title}</span>
              <span className="notif-message">{n.message}</span>
              <span className="notif-time">{formatDateTime(n.created_at)}</span>
            </div>
            {!n.is_read && <div className="notif-unread-dot" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== ORDER CARD =====
function StaffOrderCard({ order, onUpdate }: { order: any; onUpdate: () => void }) {
  const [updating, setUpdating] = useState(false);

  const getNextStatus = () => {
    const flows: Record<string, Record<string, string>> = {
      'dine-in': { pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'served', served: 'completed' },
      'take-out': { pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'completed' },
      'delivery': { pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'out_for_delivery', out_for_delivery: 'delivered', delivered: 'completed' },
    };
    return flows[order.order_type]?.[order.status] || null;
  };

  const handleUpdate = async () => {
    const next = getNextStatus();
    if (!next) return;
    setUpdating(true);
    try {
      await axios.put(`/api/orders/${order.id}/status`, { status: next });
      toast.success(`Updated to ${getStatusLabel(next)}`);
      onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setUpdating(false); }
  };

  const nextStatus = getNextStatus();

  return (
    <div className="staff-order-card glass-card">
      <div className="staff-order-header">
        <div className="staff-order-left">
          <span className="order-num">{order.order_number}</span>
          <span className={`status-badge status-${order.status}`}>{getStatusLabel(order.status)}</span>
        </div>
        <span className="order-total">{formatCurrency(order.total)}</span>
      </div>
      <div className="staff-order-meta">
        <span className="order-meta-item"><User size={13} /> {order.customer_name}</span>
        <span className="order-meta-item"><Phone size={13} /> {order.phone}</span>
        <span className="order-meta-item order-type-badge">{order.order_type}</span>
        {order.table_number && <span className="order-meta-item">Table {order.table_number}</span>}
        <span className="order-meta-item"><Clock size={13} /> {formatDateTime(order.created_at)}</span>
      </div>
      {order.order_type === 'delivery' && order.province && (
        <div className="staff-order-address"><MapPin size={13} /> {order.barangay}, {order.municipality}, {order.province}</div>
      )}
      <div className="staff-order-items">
        {order.items?.map((item: any) => (
          <div key={item.id} className="staff-item-row">
            <img src={getProductImage(item.product_image)} alt="" className="staff-item-img" />
            <div className="staff-item-info">
              <span>{item.product_name}</span>
              {item.size_label && <span className="size-tag">{item.size_label} {item.volume_ml ? `(${item.volume_ml}ml)` : ''}</span>}
            </div>
            <span className="staff-item-qty">x{item.quantity}</span>
            <span className="staff-item-price">{formatCurrency(item.subtotal)}</span>
          </div>
        ))}
      </div>
      {order.order_notes && (
        <div className="staff-order-notes"><FileText size={13} /> {order.order_notes}</div>
      )}
      {nextStatus && (
        <div className="staff-order-action">
          <button onClick={handleUpdate} className="btn btn-primary btn-sm" disabled={updating}>
            {updating ? 'Updating...' : <>{getStatusLabel(nextStatus)} <ArrowRight size={14} /></>}
          </button>
        </div>
      )}
    </div>
  );
}

// ===== STAFF LAYOUT =====
export default function StaffPanel() {
  const { user, logout, isStaff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [viewedPending, setViewedPending] = useState(() => Number(localStorage.getItem('staff_viewed_pending') || 0));

  useEffect(() => {
    if (!isStaff) { navigate('/login'); }
  }, [isStaff]);

  useEffect(() => {
    setSidebarOpen(false);
    if (location.pathname === '/staff/orders') {
      localStorage.setItem('staff_viewed_pending', pendingOrders.toString());
      setViewedPending(pendingOrders);
    }
  }, [location, pendingOrders]);

  useEffect(() => {
    if (!isStaff) return;
    const fetchNotifs = () => {
      axios.get('/api/dashboard/notifications').then(r => {
        setUnreadCount(r.data.unreadCount);
        setPendingOrders(r.data.pendingOrdersCount || 0);
      }).catch(() => { });
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, [isStaff]);

  if (!isStaff) return null;

  const newOrdersBadge = Math.max(0, pendingOrders - viewedPending);

  const navItems = [
    { path: '/staff', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/staff/orders', label: 'All Orders', icon: ShoppingBag, badge: newOrdersBadge },
  ];

  const isActive = (path: string) => {
    if (path === '/staff') return location.pathname === '/staff';
    return location.pathname.startsWith(path);
  };

  const getPageTitle = () => {
    if (location.pathname.startsWith('/staff/notifications')) return 'Notifications';
    return navItems.find(n => isActive(n.path))?.label || 'Staff';
  };

  return (
    <div className="panel-layout">
      <aside className={`panel-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Coffee size={28} className="sidebar-logo-icon" />
          <div><span className="sidebar-brand">Blend & Bond</span><span className="sidebar-role">Staff Panel</span></div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}>
              <item.icon size={18} /><span>{item.label}</span>
              {(item as any).badge > 0 && <span className="sidebar-badge">{(item as any).badge}</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="sidebar-avatar">{user?.full_name?.[0] || 'S'}</div>
            <div><span className="sidebar-user-name">{user?.full_name}</span><span className="sidebar-user-role">Staff</span></div>
          </div>
          <button onClick={() => { logout(); navigate('/'); }} className="sidebar-logout"><LogOut size={16} /> Sign Out</button>
        </div>
      </aside>

      <main className="panel-main">
        <div className="panel-topbar">
          <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? <X size={20} /> : <Menu size={20} />}</button>
          <h1 className="topbar-title">{getPageTitle()}</h1>
          <div className="topbar-actions">
            <Link to="/staff/notifications" className="topbar-notif-btn">
              <Bell size={18} />{unreadCount > 0 && <span className="notif-dot">{unreadCount}</span>}
            </Link>
          </div>
        </div>
        <div className="panel-content" key={location.pathname}>
          <Routes>
            <Route index element={<StaffDashboard />} />
            <Route path="orders" element={<StaffOrders />} />
            <Route path="notifications" element={<StaffNotifications />} />
          </Routes>
        </div>
      </main>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
