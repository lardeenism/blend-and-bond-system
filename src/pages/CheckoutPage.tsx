import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, MapPin, Clock, User, Phone, Mail, FileText, CreditCard, Utensils, ShoppingBag, Truck, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { getProductImage } from '../utils/imageMap';
import { formatCurrency, validatePhone, validateRequired, getMinSelectableDate, getWorkingHours, isWithinWorkingHours, getMinTime, isPastTimeSlot } from '../utils/helpers';
import SearchableSelect from '../components/SearchableSelect';
import './CheckoutPage.css';

interface PSGCItem { code: string; name: string; }

export default function CheckoutPage() {
  const { items, getSubtotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customer_name: '', phone: '', email: '', order_type: '' as string,
    table_number: '',
    municipality: '', municipality_code: '',
    barangay: '', barangay_code: '',
    delivery_address: '',
    order_notes: '', scheduled_date: '', scheduled_time: '',
    payment_method: 'cash'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [municipalities, setMunicipalities] = useState<PSGCItem[]>([]);
  const [barangays, setBarangays] = useState<PSGCItem[]>([]);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [municipalityError, setMunicipalityError] = useState('');
  const [barangayError, setBarangayError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ order_number: string; total: number } | null>(null);

  // Fixed location
  const PROVINCE = 'Bohol';

  // Load Bohol municipalities when delivery is selected
  useEffect(() => {
    if (form.order_type === 'delivery') {
      setLoadingMunicipalities(true);
      setMunicipalityError('');
      axios.get('/api/psgc/bohol/municipalities')
        .then(res => {
          setMunicipalities(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => {
          setMunicipalityError('Failed to load municipalities. Click to retry.');
          toast.error('Failed to load municipalities');
        })
        .finally(() => setLoadingMunicipalities(false));
    }
  }, [form.order_type]);

  // Load barangays when municipality changes
  useEffect(() => {
    if (form.municipality_code) {
      setLoadingBarangays(true);
      setBarangayError('');
      setBarangays([]);
      setForm(f => ({ ...f, barangay: '', barangay_code: '' }));
      axios.get(`/api/psgc/bohol/municipalities/${form.municipality_code}/barangays`)
        .then(res => {
          setBarangays(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => {
          setBarangayError('Failed to load barangays. Click to retry.');
          toast.error('Failed to load barangays');
        })
        .finally(() => setLoadingBarangays(false));
    }
  }, [form.municipality_code]);

  const updateForm = useCallback((field: string, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };

      // When date changes, clear time if it becomes invalid
      if (field === 'scheduled_date' && prev.scheduled_time) {
        if (value && isPastTimeSlot(value, prev.scheduled_time)) {
          next.scheduled_time = '';
          setErrors(e => ({ ...e, scheduled_time: '' }));
        }
      }

      // Real-time validation for schedule fields
      if (field === 'scheduled_time' && value && next.order_type === 'delivery') {
        if (!isWithinWorkingHours(value)) {
          setErrors(e => ({ ...e, scheduled_time: 'Time must be between 08:00 AM and 09:00 PM' }));
          setTouched(t => ({ ...t, scheduled_time: true }));
        } else if (next.scheduled_date && isPastTimeSlot(next.scheduled_date, value)) {
          setErrors(e => ({ ...e, scheduled_time: 'Cannot select a past time' }));
          setTouched(t => ({ ...t, scheduled_time: true }));
        } else {
          setErrors(e => ({ ...e, scheduled_time: '' }));
        }
      } else {
        setErrors(e => ({ ...e, [field]: '' }));
      }

      // Real-time validation for date
      if (field === 'scheduled_date' && value && next.order_type === 'delivery') {
        if (value < getMinSelectableDate()) {
          setErrors(e => ({ ...e, scheduled_date: 'Cannot select a past date' }));
          setTouched(t => ({ ...t, scheduled_date: true }));
        } else {
          setErrors(e => ({ ...e, scheduled_date: '' }));
        }
      }

      return next;
    });
  }, []);

  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    // Validate on blur
    const errs: Record<string, string> = {};
    if (field === 'customer_name') {
      const err = validateRequired(form.customer_name, 'Full name');
      if (err) errs.customer_name = err;
    }
    if (field === 'phone') {
      const err = validatePhone(form.phone);
      if (err) errs.phone = err;
    }
    if (Object.keys(errs).length > 0) {
      setErrors(prev => ({ ...prev, ...errs }));
    }
  }, [form.customer_name, form.phone]);

  const handleMunicipalityChange = useCallback((code: string, name: string) => {
    setForm(prev => ({ ...prev, municipality_code: code, municipality: name, barangay: '', barangay_code: '' }));
    setErrors(prev => ({ ...prev, municipality: '' }));
  }, []);

  const handleBarangayChange = useCallback((code: string, name: string) => {
    setForm(prev => ({ ...prev, barangay_code: code, barangay: name }));
    setErrors(prev => ({ ...prev, barangay: '' }));
  }, []);

  const retryMunicipalities = useCallback(() => {
    setLoadingMunicipalities(true);
    setMunicipalityError('');
    axios.get('/api/psgc/bohol/municipalities')
      .then(res => setMunicipalities(Array.isArray(res.data) ? res.data : []))
      .catch(() => setMunicipalityError('Failed to load. Click to retry.'))
      .finally(() => setLoadingMunicipalities(false));
  }, []);

  const retryBarangays = useCallback(() => {
    if (!form.municipality_code) return;
    setLoadingBarangays(true);
    setBarangayError('');
    axios.get(`/api/psgc/bohol/municipalities/${form.municipality_code}/barangays`)
      .then(res => setBarangays(Array.isArray(res.data) ? res.data : []))
      .catch(() => setBarangayError('Failed to load. Click to retry.'))
      .finally(() => setLoadingBarangays(false));
  }, [form.municipality_code]);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    const nameErr = validateRequired(form.customer_name, 'Full name');
    if (nameErr) errs.customer_name = nameErr;
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) errs.phone = phoneErr;
    if (!form.order_type) errs.order_type = 'Please select an order type';
    if (form.order_type === 'delivery') {
      if (!form.municipality) errs.municipality = 'Municipality is required';
      if (!form.barangay) errs.barangay = 'Barangay is required';
      if (!form.scheduled_date) errs.scheduled_date = 'Date is required for delivery';
      if (!form.scheduled_time) {
        errs.scheduled_time = 'Time is required for delivery';
      } else {
        if (!isWithinWorkingHours(form.scheduled_time)) {
          errs.scheduled_time = 'Time must be within working hours (08:00 - 21:00)';
        }
        if (form.scheduled_date && isPastTimeSlot(form.scheduled_date, form.scheduled_time)) {
          errs.scheduled_time = 'Cannot select a past time';
        }
      }
    }
    setErrors(errs);
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(errs).forEach(k => { allTouched[k] = true; });
    setTouched(prev => ({ ...prev, ...allTouched }));
    return Object.keys(errs).length === 0;
  }, [form]);

  // Determine if form is valid for button enable/disable
  const isFormValid = useMemo(() => {
    if (!form.customer_name.trim() || !form.phone || form.phone.length !== 11) return false;
    if (!form.order_type) return false;
    if (form.order_type === 'delivery') {
      if (!form.municipality || !form.barangay || !form.scheduled_date || !form.scheduled_time) return false;
      if (!isWithinWorkingHours(form.scheduled_time)) return false;
      if (isPastTimeSlot(form.scheduled_date, form.scheduled_time)) return false;
      if (form.scheduled_date < getMinSelectableDate()) return false;
    }
    return true;
  }, [form]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast.error('Please fix the errors'); return; }
    setSubmitting(true);
    try {
      const deliveryAddress = form.order_type === 'delivery'
        ? `${form.barangay}, ${form.municipality}, ${PROVINCE}${form.delivery_address ? ', ' + form.delivery_address : ''}`
        : null;
      const res = await axios.post('/api/orders', {
        customer_name: form.customer_name, phone: form.phone, email: form.email || null,
        order_type: form.order_type, table_number: form.order_type === 'dine-in' ? form.table_number : null,
        delivery_address: deliveryAddress,
        province: form.order_type === 'delivery' ? PROVINCE : null,
        municipality: form.order_type === 'delivery' ? form.municipality : null,
        barangay: form.order_type === 'delivery' ? form.barangay : null,
        order_notes: form.order_notes || null, payment_method: form.payment_method,
        scheduled_date: form.scheduled_date || null, scheduled_time: form.scheduled_time || null,
        items: items.map(item => ({
          product_id: item.id, quantity: item.quantity,
          size_label: item.size_label || null, volume_ml: item.volume_ml || null,
          price: item.price
        })),
      });
      setOrderResult({ order_number: res.data.order.order_number, total: res.data.order.total });
      clearCart();
      toast.success('Order placed successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to place order');
    } finally { setSubmitting(false); }
  }, [form, items, validate, clearCart]);

  if (orderResult) {
    return (
      <div className="checkout-page"><div className="container">
        <div className="order-success glass-card animate-scale-in">
          <CheckCircleIcon />
          <h2>Order Placed Successfully!</h2>
          <p className="success-order-number">Order Number</p>
          <h3 className="order-number-display">{orderResult.order_number}</h3>
          <p className="success-total">Total: {formatCurrency(orderResult.total)}</p>
          <p className="success-note">Save your order number to track your order status.</p>
          <div className="success-actions">
            <button onClick={() => navigate(`/track?order=${orderResult.order_number}`)} className="btn btn-primary btn-lg">Track Order</button>
            <button onClick={() => navigate('/menu')} className="btn btn-secondary">Order More</button>
          </div>
        </div>
      </div></div>
    );
  }

  if (items.length === 0) { navigate('/cart'); return null; }

  const deliveryFee = form.order_type === 'delivery' ? 50 : 0;
  const total = getSubtotal() + deliveryFee;
  const { open, close } = getWorkingHours();
  const minTime = form.scheduled_date ? getMinTime(form.scheduled_date) : open;

  return (
    <div className="checkout-page"><div className="container">
      <h1 className="checkout-title">Checkout</h1>
      <form onSubmit={handleSubmit} className="checkout-layout" noValidate>
        <div className="checkout-form">
          {/* Customer Info */}
          <div className="checkout-section glass-card">
            <h3 className="section-heading"><User size={18} /> Customer Information</h3>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className={`form-input ${errors.customer_name && touched.customer_name ? 'input-error' : ''}`}
                placeholder="Enter your full name"
                value={form.customer_name}
                onChange={e => updateForm('customer_name', e.target.value)}
                onBlur={() => handleBlur('customer_name')}
              />
              {errors.customer_name && touched.customer_name && <span className="form-error"><AlertCircle size={12} /> {errors.customer_name}</span>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} /> Phone Number *
                </label>
                <input
                  type="tel"
                  className={`form-input ${errors.phone && touched.phone ? 'input-error' : ''}`}
                  placeholder="09XXXXXXXXX"
                  value={form.phone}
                  onChange={e => updateForm('phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
                  onBlur={() => handleBlur('phone')}
                  maxLength={11}
                />
                {errors.phone && touched.phone && <span className="form-error"><AlertCircle size={12} /> {errors.phone}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} /> Email (optional)
                </label>
                <input type="email" className="form-input" placeholder="your@email.com" value={form.email} onChange={e => updateForm('email', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Order Type */}
          <div className="checkout-section glass-card">
            <h3 className="section-heading"><ShoppingBag size={18} /> Order Type *</h3>
            {errors.order_type && <span className="form-error"><AlertCircle size={12} /> {errors.order_type}</span>}
            <div className="order-type-grid">
              {[
                { value: 'dine-in', label: 'Dine-In', icon: <Utensils size={24} />, desc: 'Eat at the café' },
                { value: 'take-out', label: 'Take-Out', icon: <ShoppingBag size={24} />, desc: 'Pickup at counter' },
                { value: 'delivery', label: 'Delivery', icon: <Truck size={24} />, desc: 'Deliver to address' },
              ].map(type => (
                <button key={type.value} type="button"
                  className={`order-type-card ${form.order_type === type.value ? 'selected' : ''}`}
                  onClick={() => updateForm('order_type', type.value)}>
                  <span className="type-icon">{type.icon}</span>
                  <span className="type-label">{type.label}</span>
                  <span className="type-desc">{type.desc}</span>
                  {form.order_type === type.value && <Check size={16} className="type-check" />}
                </button>
              ))}
            </div>


            {form.order_type === 'delivery' && (
              <div className="delivery-fields" style={{ marginTop: '20px' }}>
                <div className="delivery-header"><MapPin size={16} /> <span>Delivery Address</span></div>

                {/* Location breadcrumb — fixed to Philippines > Bohol */}
                <div className="location-breadcrumb">
                  <span className="loc-crumb">🇵🇭 Philippines</span>
                  <span className="loc-separator">›</span>
                  <span className="loc-crumb active">Bohol</span>
                  {form.municipality && (
                    <>
                      <span className="loc-separator">›</span>
                      <span className="loc-crumb active">{form.municipality}</span>
                    </>
                  )}
                  {form.barangay && (
                    <>
                      <span className="loc-separator">›</span>
                      <span className="loc-crumb active">{form.barangay}</span>
                    </>
                  )}
                </div>

                {/* Municipality — Searchable */}
                <div className="form-group">
                  {municipalityError ? (
                    <div className="api-error-box" onClick={retryMunicipalities}>
                      <AlertCircle size={16} />
                      <span>{municipalityError}</span>
                      <button type="button" className="retry-btn">Retry</button>
                    </div>
                  ) : (
                    <SearchableSelect
                      label="Municipality / City"
                      required
                      options={municipalities}
                      value={form.municipality_code}
                      onChange={handleMunicipalityChange}
                      placeholder="Select municipality..."
                      loading={loadingMunicipalities}
                      disabled={loadingMunicipalities}
                      error={errors.municipality && touched.municipality ? errors.municipality : undefined}
                    />
                  )}
                </div>

                {/* Barangay — Searchable */}
                <div className="form-group">
                  {barangayError ? (
                    <div className="api-error-box" onClick={retryBarangays}>
                      <AlertCircle size={16} />
                      <span>{barangayError}</span>
                      <button type="button" className="retry-btn">Retry</button>
                    </div>
                  ) : (
                    <SearchableSelect
                      label="Barangay"
                      required
                      options={barangays}
                      value={form.barangay_code}
                      onChange={handleBarangayChange}
                      placeholder={form.municipality_code ? 'Select barangay...' : 'Select municipality first'}
                      loading={loadingBarangays}
                      disabled={!form.municipality_code || loadingBarangays}
                      error={errors.barangay && touched.barangay ? errors.barangay : undefined}
                    />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Street / Building (optional)</label>
                  <input type="text" className="form-input" placeholder="Street, building, landmark..." value={form.delivery_address} onChange={e => updateForm('delivery_address', e.target.value)} />
                </div>

                <div className="schedule-section">
                  <div className="schedule-header"><Clock size={16} /> Delivery Schedule *</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Date *</label>
                      <input 
                        type="date" 
                        className={`form-input ${errors.scheduled_date ? 'input-error' : ''}`} 
                        value={form.scheduled_date} 
                        min={getMinSelectableDate()} 
                        onChange={e => updateForm('scheduled_date', e.target.value)} 
                      />
                      {errors.scheduled_date && <span className="form-error"><AlertCircle size={12} /> {errors.scheduled_date}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Time ({open} - {close}) *</label>
                      <input
                        type="time"
                        className={`form-input ${errors.scheduled_time ? 'input-error' : ''}`}
                        value={form.scheduled_time}
                        min={minTime}
                        max={close}
                        onChange={e => updateForm('scheduled_time', e.target.value)}
                      />
                      {errors.scheduled_time && <span className="form-error"><AlertCircle size={12} /> {errors.scheduled_time}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes & Payment */}
          <div className="checkout-section glass-card">
            <h3 className="section-heading"><FileText size={18} /> Additional Info</h3>
            <div className="form-group">
              <label className="form-label">Order Notes (optional)</label>
              <textarea className="form-input form-textarea" placeholder="Any special instructions..." value={form.order_notes} onChange={e => updateForm('order_notes', e.target.value)} rows={3} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <div className="payment-option selected">
                <CreditCard size={18} /> 
                <span>
                  {form.order_type === 'delivery' ? 'Cash on Delivery (COD)' : 
                   form.order_type === 'dine-in' || form.order_type === 'take-out' ? 'Pay at Counter (Cash)' : 
                   'Cash / Cash on Delivery'}
                </span>
                <Check size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="checkout-summary glass-card">
          <h3>Order Summary</h3>
          <div className="checkout-items">
            {items.map((item, idx) => (
              <div key={`${item.id}-${item.size_label || idx}`} className="checkout-item">
                <img src={getProductImage(item.image_filename)} alt={item.name} className="checkout-item-img" />
                <div className="checkout-item-info">
                  <span className="checkout-item-name">{item.name}</span>
                  {item.size_label && <span className="checkout-item-size">{item.size_label} {item.volume_ml ? `(${item.volume_ml}ml)` : ''}</span>}
                  <span className="checkout-item-qty">x {item.quantity}</span>
                </div>
                <span className="checkout-item-price">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="summary-divider" />
          <div className="summary-line"><span>Subtotal</span><span>{formatCurrency(getSubtotal())}</span></div>
          {form.order_type === 'delivery' && <div className="summary-line"><span>Delivery Fee</span><span>{formatCurrency(deliveryFee)}</span></div>}
          <div className="summary-divider" />
          <div className="summary-line summary-total"><span>Total</span><span>{formatCurrency(total)}</span></div>
          <button
            type="submit"
            className="btn btn-primary btn-lg place-order-btn"
            disabled={submitting || !isFormValid}
          >
            {submitting ? (
              <><Loader2 size={18} className="btn-spinner" /> Placing Order...</>
            ) : (
              `Place Order — ${formatCurrency(total)}`
            )}
          </button>
          {!isFormValid && (
            <p className="form-incomplete-hint">
              <AlertCircle size={14} /> Complete all required fields to place order
            </p>
          )}
        </div>
      </form>
    </div></div>
  );
}

function CheckCircleIcon() {
  return <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Check size={32} color="white" /></div>;
}
