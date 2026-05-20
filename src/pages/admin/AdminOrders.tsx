import { useState, useEffect } from 'react';
import { Search, Eye, MapPin, Clock, Phone, User } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getProductImage } from '../../utils/imageMap';
import { formatCurrency, formatDateTime, getStatusLabel } from '../../utils/helpers';

let cachedOrders: any[] = [];

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>(cachedOrders);
  const [loading, setLoading] = useState(cachedOrders.length === 0);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    axios.get('/api/orders')
      .then(r => {
        cachedOrders = r.data.orders;
        setOrders(r.data.orders);
      })
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  const statuses = ['', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
  const filtered = orders.filter(o => {
    const matchStatus = !filter || o.status === filter;
    const matchSearch = !search || o.order_number.toLowerCase().includes(search.toLowerCase()) || o.customer_name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (loading) return null;

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Orders</h2><p className="page-subtitle">{orders.length} total orders (View Only)</p></div>
      </div>

      <div className="filters-bar">
        <div className="search-bar" style={{ flex: 1 }}>
          <Search size={16} className="search-icon" />
          <input type="text" placeholder="Search by order # or customer..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
        </div>
        <div className="filter-pills">
          {statuses.map(s => (
            <button key={s} className={`pill ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
              {s ? getStatusLabel(s) : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="orders-list">
        {filtered.length === 0 && <div className="empty-state"><p>No orders found</p></div>}
        {filtered.map(order => (
          <div key={order.id} className={`order-row glass-card ${expanded === order.id ? 'expanded' : ''}`}>
            <div className="order-row-header" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
              <div className="order-row-left">
                <span className="order-num">{order.order_number}</span>
                <span className={`status-badge status-${order.status}`}>{getStatusLabel(order.status)}</span>
              </div>
              <div className="order-row-center">
                <span className="order-meta-item"><User size={13} /> {order.customer_name}</span>
                <span className="order-meta-item"><Phone size={13} /> {order.phone}</span>
                <span className="order-meta-item"><Clock size={13} /> {formatDateTime(order.created_at)}</span>
              </div>
              <div className="order-row-right">
                <span className="order-type-badge">{order.order_type}</span>
                <span className="order-total">{formatCurrency(order.total)}</span>
                <Eye size={16} className="expand-icon" />
              </div>
            </div>

            {expanded === order.id && (
              <div className="order-detail">
                {order.order_type === 'delivery' && order.province && (
                  <div className="detail-address"><MapPin size={14} /> {order.barangay}, {order.municipality}, {order.province}</div>
                )}
                {order.table_number && <div className="detail-address">Table: {order.table_number}</div>}
                {order.order_notes && <div className="detail-notes">{order.order_notes}</div>}
                <div className="detail-items">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="detail-item">
                      <img src={getProductImage(item.product_image)} alt="" className="detail-item-img" />
                      <div className="detail-item-info">
                        <span>{item.product_name}</span>
                        {item.size_label && <span className="size-tag">{item.size_label} {item.volume_ml ? `(${item.volume_ml}ml)` : ''}</span>}
                      </div>
                      <span className="detail-item-qty">x{item.quantity}</span>
                      <span className="detail-item-price">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
                {order.tracking_logs && order.tracking_logs.length > 0 && (
                  <div className="tracking-logs-admin" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '12px' }}>Tracking History</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                      {order.tracking_logs.map((log: any) => (
                        <div key={log.id} style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {formatDateTime(log.created_at)}
                          </div>
                          <div>
                            <span style={{ fontWeight: 'bold', color: 'var(--primary)', marginRight: '8px' }}>[{log.status}]</span>
                            <span style={{ color: 'var(--text-primary)' }}>{log.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="detail-summary">
                  <div className="detail-line"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                  {parseFloat(order.delivery_fee) > 0 && <div className="detail-line"><span>Delivery</span><span>{formatCurrency(order.delivery_fee)}</span></div>}
                  <div className="detail-line detail-total"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
