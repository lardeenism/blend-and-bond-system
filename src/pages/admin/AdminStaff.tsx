import { useState, useEffect } from 'react';
import { UserPlus, Edit3, Shield, ShieldOff, Activity } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatDateTime } from '../../utils/helpers';

let cachedStaff: any[] = [];
let cachedLogs: any[] = [];

export default function AdminStaff() {
  const [staff, setStaff] = useState<any[]>(cachedStaff);
  const [logs, setLogs] = useState<any[]>(cachedLogs);
  const [loading, setLoading] = useState(cachedStaff.length === 0);
  const [editing, setEditing] = useState<any>(null);
  const [tab, setTab] = useState<'staff' | 'logs'>('staff');
  const [form, setForm] = useState({ username: '', password: '', full_name: '', email: '', phone: '', is_active: true });

  useEffect(() => {
    fetchStaff();
    axios.get('/api/staff/logs').then(r => {
      cachedLogs = r.data.logs;
      setLogs(r.data.logs);
    }).catch(() => {});
  }, []);

  const fetchStaff = () => {
    if (cachedStaff.length === 0) setLoading(true);
    axios.get('/api/staff')
      .then(r => {
        cachedStaff = r.data.staff;
        setStaff(r.data.staff);
      })
      .catch(() => toast.error('Failed to load staff'))
      .finally(() => setLoading(false));
  };

  const handleNew = () => {
    setEditing({});
    setForm({ username: '', password: '', full_name: '', email: '', phone: '', is_active: true });
  };

  const handleEdit = (s: any) => {
    setEditing(s);
    setForm({ username: s.username, password: '', full_name: s.full_name, email: s.email || '', phone: s.phone || '', is_active: s.is_active });
  };

  const handleSave = async () => {
    if (!form.full_name) { toast.error('Full name is required'); return; }
    try {
      if (editing?.id) {
        await axios.put(`/api/staff/${editing.id}`, form);
        toast.success('Staff updated');
      } else {
        if (!form.username || !form.password) { toast.error('Username and password required'); return; }
        await axios.post('/api/staff', form);
        toast.success('Staff created');
      }
      setEditing(null);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
  };

  const toggleActive = async (s: any) => {
    try {
      await axios.put(`/api/staff/${s.id}`, { ...s, is_active: !s.is_active });
      toast.success(`Staff ${!s.is_active ? 'activated' : 'deactivated'}`);
      fetchStaff();
    } catch { toast.error('Failed to update'); }
  };

  if (loading) return null;

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Staff Management</h2><p className="page-subtitle">{staff.length} staff members</p></div>
        <button onClick={handleNew} className="btn btn-primary"><UserPlus size={16} /> Add Staff</button>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'staff' ? 'active' : ''}`} onClick={() => setTab('staff')}>Staff Members</button>
        <button className={`tab-btn ${tab === 'logs' ? 'active' : ''}`} onClick={() => setTab('logs')}>Activity Logs</button>
      </div>

      {/* Staff Form Modal */}
      {editing !== null && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{editing.id ? 'Edit Staff' : 'Add Staff'}</h3>
            <div className="modal-body">
              {!editing.id && (
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Username *</label>
                    <input className="form-input" value={form.username} onChange={e => setForm({...form, username: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Password *</label>
                    <input type="password" className="form-input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
                </div>
              )}
              {editing.id && (
                <div className="form-group"><label className="form-label">New Password (leave blank to keep)</label>
                  <input type="password" className="form-input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
              )}
              <div className="form-group"><label className="form-label">Full Name *</label>
                <input className="form-input" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Email</label>
                  <input type="email" className="form-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Phone</label>
                  <input type="tel" className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} maxLength={11} /></div>
              </div>
              <div className="form-checks">
                <label className="check-label"><input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} /> Active</label>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditing(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'staff' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.full_name}</strong></td>
                  <td>{s.username}</td>
                  <td>{s.email || '—'}</td>
                  <td>{s.phone || '—'}</td>
                  <td><span className={`status-badge ${s.is_active ? 'status-completed' : 'status-cancelled'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="text-muted">{s.last_login ? formatDateTime(s.last_login) : 'Never'}</td>
                  <td><div className="action-btns">
                    <button onClick={() => handleEdit(s)} className="icon-btn edit"><Edit3 size={14} /></button>
                    <button onClick={() => toggleActive(s)} className={`icon-btn ${s.is_active ? 'delete' : 'success'}`}>
                      {s.is_active ? <ShieldOff size={14} /> : <Shield size={14} />}
                    </button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'logs' && (
        <div className="activity-list-full">
          {logs.map(log => (
            <div key={log.id} className="activity-row-full glass-card">
              <Activity size={16} className="activity-icon" />
              <div className="activity-info">
                <span className="activity-action">{log.details || log.action}</span>
                <span className="activity-meta">{log.full_name || 'System'} &middot; {formatDateTime(log.created_at)}</span>
              </div>
            </div>
          ))}
          {logs.length === 0 && <div className="empty-state"><p>No activity logs yet</p></div>}
        </div>
      )}
    </div>
  );
}
