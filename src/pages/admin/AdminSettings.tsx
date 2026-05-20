import { useState, useEffect } from 'react';
import { Save, Clock, DollarSign, Globe, Palette, Bell } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';

let cachedSettings: Record<string, string> = {};

export default function AdminSettings() {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<Record<string, string>>(cachedSettings);
  const [loading, setLoading] = useState(Object.keys(cachedSettings).length === 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get('/api/settings')
      .then(r => {
        cachedSettings = r.data.settings;
        setSettings(r.data.settings);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put('/api/settings', settings);
      // Apply theme only when explicitly saved
      if (settings.default_theme && settings.default_theme !== theme) {
        toggleTheme();
      }
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">System Settings</h2><p className="page-subtitle">Configure your café system</p></div>
        <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="settings-grid">
        {/* General */}
        <div className="settings-section glass-card">
          <div className="settings-section-header"><Globe size={18} /> <h3>General</h3></div>
          <div className="form-group"><label className="form-label">Café Name</label>
            <input className="form-input" value={settings.cafe_name || ''} onChange={e => update('cafe_name', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Order Number Prefix</label>
            <input className="form-input" value={settings.order_prefix || ''} onChange={e => update('order_prefix', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Currency Symbol</label>
            <input className="form-input" value={settings.currency_symbol || ''} onChange={e => update('currency_symbol', e.target.value)} /></div>
        </div>

        {/* Operating Hours */}
        <div className="settings-section glass-card">
          <div className="settings-section-header"><Clock size={18} /> <h3>Operating Hours</h3></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Opening Time</label>
              <input type="time" className="form-input" value={settings.operating_hours_open || ''} onChange={e => update('operating_hours_open', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Closing Time</label>
              <input type="time" className="form-input" value={settings.operating_hours_close || ''} onChange={e => update('operating_hours_close', e.target.value)} /></div>
          </div>
        </div>

        {/* Delivery & Payment */}
        <div className="settings-section glass-card">
          <div className="settings-section-header"><DollarSign size={18} /> <h3>Delivery & Payment</h3></div>
          <div className="form-group"><label className="form-label">Delivery Fee (₱)</label>
            <input type="number" className="form-input" value={settings.delivery_fee || ''} onChange={e => update('delivery_fee', e.target.value)} /></div>
        </div>

        {/* Appearance */}
        <div className="settings-section glass-card">
          <div className="settings-section-header"><Palette size={18} /> <h3>Appearance</h3></div>
          <div className="form-group"><label className="form-label">Default Theme</label>
            <select className="form-select" value={settings.default_theme || 'light'} onChange={e => update('default_theme', e.target.value)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select></div>
        </div>

        {/* Notifications */}
        <div className="settings-section glass-card">
          <div className="settings-section-header"><Bell size={18} /> <h3>Notifications</h3></div>
          <div className="form-checks">
            <label className="check-label">
              <input type="checkbox" checked={settings.enable_notifications === 'true'}
                onChange={e => update('enable_notifications', String(e.target.checked))} /> Enable system notifications
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
