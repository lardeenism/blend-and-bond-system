import { useState, useEffect } from 'react';
import { Bell, CheckCircle, ShoppingBag, Users, AlertTriangle, CheckCheck } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatDateTime } from '../../utils/helpers';

const TYPE_ICONS: Record<string, any> = {
  order_placed: ShoppingBag,
  order_updated: CheckCircle,
  order_cancelled: AlertTriangle,
  staff_added: Users,
  system_alert: Bell,
  review_added: Bell,
};

let cachedNotifications: any[] = [];

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<any[]>(cachedNotifications);
  const [loading, setLoading] = useState(cachedNotifications.length === 0);

  useEffect(() => { fetchNotifs(); }, []);

  const fetchNotifs = () => {
    if (cachedNotifications.length === 0) setLoading(true);
    axios.get('/api/dashboard/notifications')
      .then(r => {
        cachedNotifications = r.data.notifications;
        setNotifications(r.data.notifications);
      })
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false));
  };

  const markRead = async (id: number) => {
    await axios.put(`/api/dashboard/notifications/${id}/read`);
    fetchNotifs();
  };

  const markAllRead = async () => {
    await axios.put('/api/dashboard/notifications/read-all');
    toast.success('All marked as read');
    fetchNotifs();
  };

  const unread = notifications.filter(n => !n.is_read).length;

  if (loading) return null;

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Notifications</h2><p className="page-subtitle">{unread} unread</p></div>
        {unread > 0 && <button onClick={markAllRead} className="btn btn-secondary"><CheckCheck size={16} /> Mark All Read</button>}
      </div>

      <div className="notif-list">
        {notifications.length === 0 && <div className="empty-state"><Bell size={40} className="empty-icon" /><p>No notifications yet</p></div>}
        {notifications.map(n => {
          const Icon = TYPE_ICONS[n.type] || Bell;
          return (
            <div key={n.id} className={`notif-card glass-card ${!n.is_read ? 'unread' : ''}`} onClick={() => !n.is_read && markRead(n.id)}>
              <div className={`notif-icon-wrap notif-type-${n.type}`}><Icon size={18} /></div>
              <div className="notif-body">
                <span className="notif-title">{n.title}</span>
                <span className="notif-message">{n.message}</span>
                <span className="notif-time">{formatDateTime(n.created_at)}</span>
              </div>
              {!n.is_read && <div className="notif-unread-dot" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
