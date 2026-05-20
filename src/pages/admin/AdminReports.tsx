import { useState, useEffect } from 'react';
import { TrendingUp, Package, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/helpers';
import { getProductImage } from '../../utils/imageMap';

const COLORS = ['#C8956C', '#E8B88A', '#A67B5B', '#DEB887', '#8B6F47', '#D4A574'];
let cachedReportData: any = null;

export default function AdminReports() {
  const [data, setData] = useState<any>(cachedReportData);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(!cachedReportData);

  useEffect(() => { fetchReport(); }, [period]);

  const fetchReport = () => {
    if (!cachedReportData) setLoading(true);
    axios.get(`/api/reports/sales?period=${period}`)
      .then(r => {
        cachedReportData = r.data;
        setData(r.data);
      })
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  };

  if (loading) return null;
  if (!data) return <div className="empty-state"><p>No report data</p></div>;

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Sales Reports</h2><p className="page-subtitle">Revenue and performance analytics</p></div>
        <div className="period-selector">
          {['daily', 'weekly', 'monthly'].map(p => (
            <button key={p} className={`pill ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <div className="stat-card stat-success"><div className="stat-icon-wrap"><TrendingUp size={20} /></div><div><div className="stat-value">{formatCurrency(data.summary?.total_revenue)}</div><div className="stat-label">Revenue</div></div></div>
        <div className="stat-card stat-primary"><div className="stat-icon-wrap"><Package size={20} /></div><div><div className="stat-value">{data.summary?.total_orders}</div><div className="stat-label">Orders</div></div></div>
        <div className="stat-card stat-warning"><div className="stat-icon-wrap"><TrendingUp size={20} /></div><div><div className="stat-value">{formatCurrency(data.summary?.avg_order_value)}</div><div className="stat-label">Avg Order</div></div></div>
        <div className="stat-card stat-info"><div className="stat-icon-wrap"><Users size={20} /></div><div><div className="stat-value">{data.summary?.unique_customers}</div><div className="stat-label">Customers</div></div></div>
      </div>

      {/* Revenue Chart */}
      <div className="chart-card glass-card">
        <h3 className="chart-title">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data.dailyRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="revenue" stroke="#C8956C" fill="#C8956C33" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="dashboard-charts">
        {/* Category Revenue */}
        <div className="chart-card glass-card">
          <h3 className="chart-title">Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.categoryRevenue} cx="50%" cy="50%" outerRadius={90} dataKey="revenue" label={({ name }: any) => `${name}`}>
                {data.categoryRevenue?.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Order Type Breakdown */}
        <div className="chart-card glass-card">
          <h3 className="chart-title">Order Types</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.orderTypes}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="order_type" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#A67B5B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products */}
      <div className="chart-card glass-card">
        <h3 className="chart-title">Top Products</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              {data.topProducts?.map((p: any, i: number) => (
                <tr key={i}>
                  <td><div className="product-cell"><img src={getProductImage(p.image_filename)} alt="" className="table-img" /><span>{p.name}</span></div></td>
                  <td>{p.sold} units</td>
                  <td className="text-primary"><strong>{formatCurrency(p.revenue)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
