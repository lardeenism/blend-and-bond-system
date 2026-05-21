import { useState, useEffect } from 'react';
import { ShoppingBag, DollarSign, Clock, CheckCircle, Users, Package, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getProductImage } from '../../utils/imageMap';
import { formatCurrency, formatDateTime, getStatusLabel } from '../../utils/helpers';

const CHART_COLORS = ['#C8956C', '#E8B88A', '#A67B5B', '#DEB887', '#8B6F47', '#D4A574'];

// Cache dashboard data
let cachedDashboardData: any = null;

export default function AdminDashboard() {
  const [data, setData] = useState<any>(cachedDashboardData);
  const [loading, setLoading] = useState(!cachedDashboardData);

  useEffect(() => {
    axios.get('/api/dashboard/stats')
      .then(res => {
        cachedDashboardData = res.data;
        setData(res.data);
      })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return null;
  }

  const { stats, popularProducts, recentOrders, dailyRevenue, recentLogs, ordersByStatus } = data;
  const statusData = ordersByStatus?.map((s: any) => ({ name: getStatusLabel(s.status), value: Number(s.count) })) || [];

  return (
    <div className="admin-dashboard">
      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard icon={<ShoppingBag size={22} />} label="Total Orders" value={stats.totalOrders} color="primary" />
        <StatCard icon={<DollarSign size={22} />} label="Total Revenue" value={formatCurrency(stats.totalRevenue)} color="success" />
        <StatCard icon={<Clock size={22} />} label="Pending Orders" value={stats.pendingOrders} color="warning" />
        <StatCard icon={<Activity size={22} />} label="Active Orders" value={stats.activeOrders} color="info" />
        <StatCard icon={<CheckCircle size={22} />} label="Completed" value={stats.completedOrders} color="success" />

        <StatCard icon={<Package size={22} />} label="Products" value={stats.totalProducts} color="accent" />
        <StatCard icon={<TrendingUp size={22} />} label="Today Revenue" value={formatCurrency(stats.todayRevenue)} color="success" />
      </div>

      {/* Charts Row */}
      <div className="dashboard-charts">
        <div className="chart-card glass-card">
          <h3 className="chart-title">Revenue (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '8px' }} />
              <Bar dataKey="revenue" fill="#C8956C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card glass-card">
          <h3 className="chart-title">Orders by Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }: any) => `${name}: ${value}`}>
                {statusData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="dashboard-bottom">
        <div className="dash-section glass-card">
          <h3 className="section-heading">Best Selling Products</h3>
          <div className="popular-list">
            {popularProducts?.map((p: any, i: number) => (
              <div key={i} className="popular-row">
                <span className="popular-rank">#{i + 1}</span>
                <img src={getProductImage(p.image_filename)} alt={p.name} className="popular-img" />
                <div className="popular-info">
                  <span className="popular-name">{p.name}</span>
                  <span className="popular-sold">{p.total_sold} sold</span>
                </div>
                <span className="popular-revenue">{formatCurrency(p.total_revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-section glass-card">
          <h3 className="section-heading">Recent Orders</h3>
          <div className="recent-list">
            {recentOrders?.slice(0, 8).map((o: any) => (
              <div key={o.id} className="recent-row">
                <div className="recent-info">
                  <span className="recent-num">{o.order_number}</span>
                  <span className="recent-date">{formatDateTime(o.created_at)}</span>
                </div>
                <span className={`status-badge status-${o.status}`}>{getStatusLabel(o.status)}</span>
                <span className="recent-total">{formatCurrency(o.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-section glass-card">
          <h3 className="section-heading">Activity Log</h3>
          <div className="activity-list">
            {recentLogs?.slice(0, 10).map((log: any) => (
              <div key={log.id} className="activity-row">
                <Activity size={14} className="activity-icon" />
                <div className="activity-info">
                  <span className="activity-action">{log.details || log.action}</span>
                  <span className="activity-meta">{log.full_name || 'System'} · {formatDateTime(log.created_at)}</span>
                </div>
              </div>
            ))}
            {(!recentLogs || recentLogs.length === 0) && <p className="empty-text">No activity yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: any; color: string }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-icon-wrap">{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}
